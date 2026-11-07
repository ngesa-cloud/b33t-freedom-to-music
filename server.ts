import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import os from 'os';
import child_process from 'child_process';
import { Readable } from 'stream';
import { create as createYtDlp } from 'yt-dlp-exec';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const CACHE_DIR = path.resolve(process.cwd(), 'audio_cache');
const FALLBACK_MP3 = path.resolve(process.cwd(), 'public', 'fallback.mp3');
const FALLBACK_OPUS = path.resolve(process.cwd(), 'public', 'fallback.opus');

// Locate or guarantee standalone yt-dlp binary
const potentialBins = [
  '/usr/local/bin/yt-dlp',
  path.resolve(process.cwd(), 'node_modules/yt-dlp-exec/bin/yt-dlp'),
  path.resolve(process.cwd(), 'yt-dlp'),
  path.join(os.homedir(), '.local/bin/yt-dlp'),
  '/usr/bin/yt-dlp',
  '/tmp/yt-dlp',
];

const moduleBinDir = path.resolve(process.cwd(), 'node_modules/yt-dlp-exec/bin');
const moduleBinPath = path.join(moduleBinDir, 'yt-dlp');

function resolveExistingYtDlpBin(): string | null {
  for (const p of potentialBins) {
    try {
      if (fs.existsSync(p) && fs.statSync(p).size > 1_000_000) {
        return p;
      }
    } catch {}
  }
  return null;
}

let YTDLP_BIN = resolveExistingYtDlpBin() || moduleBinPath;
let ytDlpDownloadPromise: Promise<string | null> | null = null;

async function ensureYtDlpBinary(): Promise<string | null> {
  const existing = resolveExistingYtDlpBin();
  if (existing) {
    YTDLP_BIN = existing;
    if (!fs.existsSync(moduleBinPath)) {
      try {
        fs.mkdirSync(moduleBinDir, { recursive: true });
        fs.copyFileSync(existing, moduleBinPath);
        fs.chmodSync(moduleBinPath, 0o755);
      } catch {}
    }
    return existing;
  }

  if (ytDlpDownloadPromise) return ytDlpDownloadPromise;

  ytDlpDownloadPromise = (async () => {
    try {
      const binUrl =
        process.platform === 'darwin'
          ? 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos'
          : 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux';
      console.log(`[yt-dlp] Provisioning standalone binary from ${binUrl}...`);
      const res = await fetch(binUrl);
      if (!res.ok) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 1_000_000) return null;

      fs.mkdirSync(moduleBinDir, { recursive: true });
      const tmpTarget = `${moduleBinPath}.part`;
      fs.writeFileSync(tmpTarget, buf, { mode: 0o755 });
      fs.renameSync(tmpTarget, moduleBinPath);
      fs.chmodSync(moduleBinPath, 0o755);
      YTDLP_BIN = moduleBinPath;
      console.log(`[yt-dlp] Standalone binary ready at ${moduleBinPath}`);
      return moduleBinPath;
    } catch {
      return null;
    } finally {
      ytDlpDownloadPromise = null;
    }
  })();

  return ytDlpDownloadPromise;
}

// Kick off binary check at startup
void ensureYtDlpBinary();
const ytClient = createYtDlp(YTDLP_BIN);

// Ensure directories exist
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Detect true audio MIME type from file magic bytes
function detectMimeType(filePath: string): string {
  try {
    const buffer = Buffer.alloc(12);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 12, 0);
    fs.closeSync(fd);

    // Ogg container (Opus / Vorbis)
    if (buffer[0] === 0x4f && buffer[1] === 0x67 && buffer[2] === 0x67 && buffer[3] === 0x53) {
      return 'audio/ogg';
    }
    // MP3 (ID3v2 or MPEG sync frame)
    if (
      (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) ||
      (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0)
    ) {
      return 'audio/mpeg';
    }
    // WebM
    if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
      return 'audio/webm';
    }
    // MP4 / M4A (ftyp box)
    if (buffer.toString('utf8', 4, 8) === 'ftyp') {
      return 'audio/mp4';
    }
  } catch (e) {
    // fallback to extension check
  }

  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.mp3') return 'audio/mpeg';
  if (ext === '.opus' || ext === '.ogg') return 'audio/ogg';
  if (ext === '.webm') return 'audio/webm';
  if (ext === '.m4a' || ext === '.mp4') return 'audio/mp4';
  return 'audio/mpeg';
}

const AUDIO_EXTS = ['.opus', '.mp3', '.webm', '.m4a'] as const;
const MAX_CACHE_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB LRU cap

// Purge any leftover .part files or old 30-second preview files (< 50 KB) from audio_cache on startup
try {
  for (const file of fs.readdirSync(CACHE_DIR)) {
    const fullP = path.join(CACHE_DIR, file);
    const st = fs.statSync(fullP);
    if (st.isFile() && (file.endsWith('.part') || st.size < 50_000)) {
      fs.unlinkSync(fullP);
    }
  }
} catch {}

// Find existing cached full-length track (>= 50 KB so fragments are never used)
function findCachedTrack(videoId: string): string | null {
  const safeId = videoId.replace(/[^a-zA-Z0-9_-]/g, '_');
  for (const candidateId of [videoId, safeId]) {
    for (const ext of AUDIO_EXTS) {
      const p = path.join(CACHE_DIR, `${candidateId}${ext}`);
      if (fs.existsSync(p) && fs.statSync(p).size >= 50_000) {
        return p;
      }
    }
  }
  return null;
}

// LRU eviction by mtime when cache exceeds MAX_CACHE_BYTES
function evictCacheIfNeeded() {
  try {
    const entries = fs
      .readdirSync(CACHE_DIR)
      .filter((f) => AUDIO_EXTS.some((ext) => f.endsWith(ext)))
      .map((f) => {
        const fullPath = path.join(CACHE_DIR, f);
        const stat = fs.statSync(fullPath);
        return { fullPath, size: stat.size, mtimeMs: stat.mtimeMs };
      })
      .sort((a, b) => a.mtimeMs - b.mtimeMs); // oldest first

    let total = entries.reduce((acc, e) => acc + e.size, 0);
    for (const entry of entries) {
      if (total <= MAX_CACHE_BYTES) break;
      fs.unlinkSync(entry.fullPath);
      total -= entry.size;
      console.log(`[cache] LRU evicted ${path.basename(entry.fullPath)} (${(entry.size / 1024).toFixed(1)} KB)`);
    }
  } catch (err: any) {
    console.warn('[cache] LRU eviction warning:', err?.message);
  }
}

let cachedScClientId = '2yeWkbX88QhTzS3OtZp8cLGaJRrOAWwF';
async function getSoundCloudClientId(): Promise<string> {
  if (cachedScClientId) return cachedScClientId;
  try {
    const scHome = await fetch('https://soundcloud.com').then((r) => r.text());
    const scripts = [...scHome.matchAll(/src="(https:\/\/a-v2\.sndcdn\.com\/assets\/[^"]+\.js)"/g)].map(
      (m) => m[1]
    );
    for (const s of scripts.slice(-5)) {
      const js = await fetch(s).then((r) => r.text());
      const m = js.match(/client_id\s*:\s*"([a-zA-Z0-9]{32})"/);
      if (m) {
        cachedScClientId = m[1];
        return cachedScClientId;
      }
    }
  } catch {}
  return '2yeWkbX88QhTzS3OtZp8cLGaJRrOAWwF';
}

// Fallback full-song stitcher with .part atomic rename when yt-dlp encounters datacenter IP block
async function stitchFullSongFallback(videoId: string, title?: string, artist?: string): Promise<string | null> {
  let searchTitle = title || '';
  let searchArtist = artist || '';

  if (!searchTitle && !searchArtist && isValidYouTubeId(videoId)) {
    try {
      const oembedRes = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
      );
      if (oembedRes.ok) {
        const oembedData = (await oembedRes.json()) as any;
        searchTitle = (oembedData.title || '')
          .replace(/\(Official.*?\)|\[Official.*?\]|\(Visualizer\)|\(Lyrics\)|\(Audio\)/gi, '')
          .trim();
        searchArtist = (oembedData.author_name || '').replace(/\s*-\s*Topic|VEVO/gi, '').trim();
      }
    } catch {}
  }

  const query = [searchArtist, searchTitle].filter(Boolean).join(' ').trim();
  if (!query) return null;

  try {
    let clientId = await getSoundCloudClientId();
    let scRes = await fetch(
      `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(query)}&client_id=${clientId}&limit=25`
    );
    if (scRes.status === 401 || scRes.status === 403) {
      cachedScClientId = '';
      clientId = await getSoundCloudClientId();
      scRes = await fetch(
        `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(query)}&client_id=${clientId}&limit=25`
      );
    }

    if (scRes.ok) {
      const scData = (await scRes.json()) as any;
      const candidates = (scData.collection || []).filter(
        (t: any) =>
          t.duration >= 95_000 &&
          t.duration <= 540_000 &&
          t.policy !== 'SNIP' &&
          t.policy !== 'BLOCK' &&
          t.media?.transcodings?.some(
            (tr: any) =>
              !tr.snipped && (tr.format?.protocol === 'progressive' || tr.format?.protocol === 'hls')
          )
      );

      const cleanTitleLower = searchTitle.toLowerCase();
      candidates.sort((a: any, b: any) => {
        const aTitle = (a.title || '').toLowerCase();
        const bTitle = (b.title || '').toLowerCase();
        const aIsInst = aTitle.includes('instrumental') || aTitle.includes('karaoke') ? 1 : 0;
        const bIsInst = bTitle.includes('instrumental') || bTitle.includes('karaoke') ? 1 : 0;
        if (aIsInst !== bIsInst) return aIsInst - bIsInst;
        const aHasTitle = cleanTitleLower && aTitle.includes(cleanTitleLower) ? 0 : 1;
        const bHasTitle = cleanTitleLower && bTitle.includes(cleanTitleLower) ? 0 : 1;
        return aHasTitle - bHasTitle;
      });

      const fullTrack = candidates[0];
      if (fullTrack) {
        const tr =
          fullTrack.media.transcodings.find(
            (x: any) => !x.snipped && x.format?.protocol === 'hls' && x.format?.mime_type?.includes('mp4')
          ) ||
          fullTrack.media.transcodings.find(
            (x: any) => !x.snipped && x.format?.protocol === 'progressive'
          ) ||
          fullTrack.media.transcodings.find(
            (x: any) => !x.snipped && x.format?.protocol === 'hls'
          );

        if (tr && tr.url) {
          const sep = tr.url.includes('?') ? '&' : '?';
          const streamInfoRes = await fetch(`${tr.url}${sep}client_id=${clientId}`);
          if (streamInfoRes.ok) {
            const streamInfo = (await streamInfoRes.json()) as any;
            if (streamInfo?.url) {
              const safeId = videoId.replace(/[^a-zA-Z0-9_-]/g, '_');
              if (tr.format?.protocol === 'progressive') {
                const mp3Res = await fetch(streamInfo.url);
                if (mp3Res.ok) {
                  const buf = Buffer.from(await mp3Res.arrayBuffer());
                  if (buf.length >= 50_000) {
                    const partPath = path.join(CACHE_DIR, `${safeId}.mp3.part`);
                    const finalPath = path.join(CACHE_DIR, `${safeId}.mp3`);
                    fs.writeFileSync(partPath, buf);
                    fs.renameSync(partPath, finalPath);
                    evictCacheIfNeeded();
                    console.log(`[cache] stored ${safeId} (${(buf.length / 1024).toFixed(1)} KB)`);
                    return finalPath;
                  }
                }
              } else {
                const m3u8Text = await fetch(streamInfo.url).then((r) => r.text());
                const mapMatch = m3u8Text.match(/#EXT-X-MAP:URI="([^"]+)"/);
                const segUrls = m3u8Text
                  .split('\n')
                  .map((l) => l.trim())
                  .filter((l) => l.startsWith('http'));
                const allUrls = mapMatch ? [mapMatch[1], ...segUrls] : segUrls;
                if (allUrls.length > 0) {
                  const segBuffers = await Promise.all(
                    allUrls.map((u) =>
                      fetch(u)
                        .then((r) => r.arrayBuffer())
                        .then((ab) => Buffer.from(ab))
                    )
                  );
                  const fullBuffer = Buffer.concat(segBuffers);
                  if (fullBuffer.length >= 50_000) {
                    const ext = tr.format?.mime_type?.includes('mpeg') ? '.mp3' : '.m4a';
                    const partPath = path.join(CACHE_DIR, `${safeId}${ext}.part`);
                    const finalPath = path.join(CACHE_DIR, `${safeId}${ext}`);
                    fs.writeFileSync(partPath, fullBuffer);
                    fs.renameSync(partPath, finalPath);
                    evictCacheIfNeeded();
                    console.log(`[cache] stored ${safeId} (${(fullBuffer.length / 1024).toFixed(1)} KB)`);
                    return finalPath;
                  }
                }
              }
            }
          }
        }
      }
    }
  } catch (e: any) {
    console.warn(`[cache] stitcher warning for "${query}":`, e?.message);
  }
  return null;
}

// real byte download via yt-dlp; verifies size; atomic rename; dedupe per videoId
const inflight = new Map<string, Promise<string | null>>();

async function fetchAndCacheRealAudio(
  videoId: string,
  title?: string,
  artist?: string
): Promise<string | null> {
  const existing = findCachedTrack(videoId);
  if (existing) return existing;

  if (inflight.has(videoId)) return inflight.get(videoId)!;

  const job = (async (): Promise<string | null> => {
    try {
      if (!isValidYouTubeId(videoId)) {
        return await stitchFullSongFallback(videoId, title, artist);
      }

      const bin = await ensureYtDlpBinary();
      if (!bin) {
        return await stitchFullSongFallback(videoId, title, artist);
      }

      // .part path so concurrent readers never see a half file
      const partPath = path.join(CACHE_DIR, `${videoId}.opus.part`);
      const finalPath = path.join(CACHE_DIR, `${videoId}.opus`);

      return await new Promise<string | null>((resolve) => {
        const proc = child_process.spawn(
          bin,
          [
            `https://www.youtube.com/watch?v=${videoId}`,
            '-f', 'ba[acodec=opus]/ba[acodec=mp4a]/ba',
            '-x', '--audio-format', 'opus',
            '-o', partPath,
            '--no-playlist',
            '--no-warnings',
            '--extractor-args', 'youtube:player_client=web_safari,tv_embedded,android,web',
            '--user-agent',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            '--referer', 'https://www.youtube.com/',
          ],
          { timeout: 120_000 }
        );

        proc.on('error', () => {
          stitchFullSongFallback(videoId, title, artist)
            .then(resolve)
            .catch(() => resolve(null));
        });
        proc.on('close', (code) => {
          try {
            if (code !== 0) {
              if (fs.existsSync(partPath)) fs.unlinkSync(partPath);
              stitchFullSongFallback(videoId, title, artist)
                .then(resolve)
                .catch(() => resolve(null));
              return;
            }
            // yt-dlp may emit `id.opus` from `id.opus.part` base — check both
            const candidates = [partPath, partPath.replace(/\.part$/, '')];
            const produced = candidates.find((p) => fs.existsSync(p));
            if (!produced) {
              stitchFullSongFallback(videoId, title, artist)
                .then(resolve)
                .catch(() => resolve(null));
              return;
            }

            const size = fs.statSync(produced).size;
            if (size < 50_000) {
              fs.unlinkSync(produced);
              stitchFullSongFallback(videoId, title, artist)
                .then(resolve)
                .catch(() => resolve(null));
              return;
            }
            fs.renameSync(produced, finalPath);
            evictCacheIfNeeded();
            console.log(`[cache] stored ${videoId} (${(size / 1024).toFixed(1)} KB)`);
            resolve(finalPath);
          } catch {
            resolve(null);
          }
        });
      });
    } catch {
      return null;
    } finally {
      inflight.delete(videoId);
    }
  })();

  inflight.set(videoId, job);
  return job;
}

// max 2 concurrent downloads; queue skips in-flight and cached
const PREWARM_CONCURRENCY = 2;
let prewarmActive = 0;
const prewarmBacklog: string[] = [];

function prewarmQueue(videoIds: string[]) {
  if (!videoIds || videoIds.length === 0) return;
  for (const id of videoIds) {
    if (!id || !isValidYouTubeId(id)) continue;
    if (findCachedTrack(id)) continue;
    if (inflight.has(id)) continue;
    if (!prewarmBacklog.includes(id)) prewarmBacklog.push(id);
  }
  drainPrewarm();
}

function drainPrewarm() {
  while (prewarmActive < PREWARM_CONCURRENCY && prewarmBacklog.length > 0) {
    const id = prewarmBacklog.shift()!;
    const known = curatedFallbackTracks.find((t) => t.video_id === id);
    prewarmActive++;
    fetchAndCacheRealAudio(id, known?.title, known?.artist)
      .catch((err) => console.warn(`[prewarm] ${id}:`, err?.message))
      .finally(() => {
        prewarmActive--;
        drainPrewarm();
      });
  }
}

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Range');
  res.header('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length, Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

// Helper to proxy remote audio stream with robust HTTP Range header forwarding
async function proxyStreamUrl(req: Request, res: Response, streamUrl: string, defaultMime = 'audio/webm') {
  try {
    const upstreamHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://www.youtube.com/',
      'Accept': '*/*',
    };

    // Forward the client's Range header so the browser can seek through the stream
    if (req.headers.range) {
      upstreamHeaders['Range'] = req.headers.range;
    }

    const upstreamRes = await fetch(streamUrl, {
      headers: upstreamHeaders,
      redirect: 'follow',
    });

    const status = upstreamRes.status === 206 ? 206 : (upstreamRes.status >= 200 && upstreamRes.status < 300 ? upstreamRes.status : 200);

    const commonHeaders: Record<string, string> = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type, Accept',
      'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length, Content-Type, X-Stream-Type',
      'Accept-Ranges': 'bytes',
      'X-Stream-Type': 'real',
      'Cache-Control': 'public, max-age=86400',
    };

    const rawContentType = upstreamRes.headers.get('content-type') || defaultMime;
    const contentType = rawContentType.split(';')[0].trim() || defaultMime;
    const contentRange = upstreamRes.headers.get('content-range');
    const contentLength = upstreamRes.headers.get('content-length');

    const responseHeaders: Record<string, string> = {
      ...commonHeaders,
      'Content-Type': contentType,
    };
    if (contentRange) responseHeaders['Content-Range'] = contentRange;
    if (contentLength) responseHeaders['Content-Length'] = contentLength;

    res.writeHead(status, responseHeaders);

    if (req.method === 'HEAD' || !upstreamRes.body) {
      res.end();
      return;
    }

    // Convert Web ReadableStream to Node Readable and pipe cleanly to Express res
    const nodeReadable = Readable.fromWeb(upstreamRes.body as any);
    req.on('close', () => {
      nodeReadable.destroy();
    });
    nodeReadable.on('error', (err) => {
      console.warn('[Proxy Stream Readable error]:', err?.message);
      if (!res.writableEnded) res.end();
    });
    nodeReadable.pipe(res);
  } catch (proxyErr: any) {
    console.warn('[Proxy stream error]:', proxyErr?.message || proxyErr);
    if (!res.headersSent) {
      serveFallback(req, res, 'proxy_failed');
    }
  }
}

// Validate YouTube video ID (must be exactly 11 base64url characters)
function isValidYouTubeId(id: string): boolean {
  return typeof id === 'string' && /^[a-zA-Z0-9_-]{11}$/.test(id);
}

// Scrape YouTube for 11-character video ID from title & artist query
async function resolveYouTubeVideoId(query: string): Promise<string | null> {
  if (!query || !query.trim()) return null;
  try {
    const res = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%253D%253D`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    const html = await res.text();
    const matches = [...html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)].map((m) => m[1]);
    const valid = matches.find((id) => isValidYouTubeId(id));
    return valid || null;
  } catch {
    return null;
  }
}

// Scrape full YouTube search results with authentic 11-character video IDs + ytInitialData drift counter
let ytSearchConsecutiveNulls = 0;

async function searchYouTubeVideos(query: string) {
  try {
    const res = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIQAQ%253D%253D`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    const html = await res.text();
    const jsonMatch = html.match(/var ytInitialData = ({.*?});<\/script>/);
    if (!jsonMatch) {
      ytSearchConsecutiveNulls++;
      if (ytSearchConsecutiveNulls >= 3) {
        console.error(`[ALERT: ytInitialData Drift] searchYouTubeVideos failed ${ytSearchConsecutiveNulls} consecutive times (missing ytInitialData script).`);
      }
      return null;
    }

    const data = JSON.parse(jsonMatch[1]);
    const contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents || [];
    const videos: Array<{
      video_id: string;
      title: string;
      artist: string;
      album: string;
      duration: number;
      thumbnail: string;
    }> = [];

    for (const item of contents) {
      const v = item.videoRenderer;
      if (v && v.videoId && isValidYouTubeId(v.videoId) && v.title?.runs?.[0]?.text) {
        const titleText = v.title.runs[0].text;
        const channelName = v.ownerText?.runs?.[0]?.text || 'Artist';
        const lengthText = v.lengthText?.simpleText || '3:30';
        const parts = lengthText.split(':').map((p: string) => parseInt(p, 10));
        const durationSec = parts.length === 2 ? parts[0] * 60 + parts[1] : 210;
        const thumb = v.thumbnail?.thumbnails?.slice(-1)[0]?.url || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`;

        videos.push({
          video_id: v.videoId,
          title: titleText,
          artist: channelName,
          album: 'Single',
          duration: durationSec,
          thumbnail: thumb,
        });
      }
    }
    if (videos.length === 0) {
      ytSearchConsecutiveNulls++;
      if (ytSearchConsecutiveNulls >= 3) {
        console.error(`[ALERT: ytInitialData Drift] searchYouTubeVideos returned 0 videoRenderers ${ytSearchConsecutiveNulls} consecutive times.`);
      }
      return null;
    }
    ytSearchConsecutiveNulls = 0;
    return videos;
  } catch (e: any) {
    ytSearchConsecutiveNulls++;
    if (ytSearchConsecutiveNulls >= 3) {
      console.error(`[ALERT: ytInitialData Drift] searchYouTubeVideos exception (#${ytSearchConsecutiveNulls}):`, e?.message || e);
    }
    return null;
  }
}

// Per-endpoint circuit breaker for Piped / Invidious instances (drop after 3 consecutive failures, probe after 5m)
const ENDPOINT_COOLDOWN_MS = 5 * 60 * 1000;
const endpointHealth = new Map<string, { fails: number; cooldownUntil: number }>();

function isEndpointHealthy(endpoint: string): boolean {
  const state = endpointHealth.get(endpoint);
  if (!state) return true;
  if (state.fails < 3) return true;
  if (Date.now() >= state.cooldownUntil) {
    // Allow a single probe attempt
    return true;
  }
  return false;
}

function recordEndpointSuccess(endpoint: string) {
  endpointHealth.set(endpoint, { fails: 0, cooldownUntil: 0 });
}

function recordEndpointFailure(endpoint: string) {
  const prev = endpointHealth.get(endpoint) || { fails: 0, cooldownUntil: 0 };
  const fails = prev.fails + 1;
  const cooldownUntil = fails >= 3 ? Date.now() + ENDPOINT_COOLDOWN_MS : 0;
  if (fails === 3) {
    console.warn(`[Tier 1 Circuit Breaker] Dropping ${endpoint} for 5m after 3 consecutive failures`);
  }
  endpointHealth.set(endpoint, { fails, cooldownUntil });
}

// Resolve audio stream via public Piped / Invidious instances (Tier 1)
async function resolvePipedAudioStream(videoId: string): Promise<{ url: string; mimeType: string } | null> {
  if (!isValidYouTubeId(videoId)) {
    return null;
  }

  const pipedCandidates = [
    'https://pipedapi.kavin.rocks/streams/',
    'https://pipedapi.tokhmi.xyz/streams/',
    'https://piped-api.lunar.icu/streams/',
    'https://pipedapi.leptons.xyz/streams/',
    'https://api.piped.privacydev.net/streams/',
  ];

  for (const endpoint of pipedCandidates) {
    if (!isEndpointHealthy(endpoint)) continue;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`${endpoint}${videoId}`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = (await res.json()) as any;
        if (data.audioStreams && Array.isArray(data.audioStreams) && data.audioStreams.length > 0) {
          const sorted = [...data.audioStreams].sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
          const best = sorted[0];
          if (best && best.url) {
            recordEndpointSuccess(endpoint);
            console.log(`[Tier 1: Piped] Resolved real audio stream from ${endpoint} for ${videoId}`);
            return { url: best.url, mimeType: best.mimeType || 'audio/webm' };
          }
        }
      }
      recordEndpointFailure(endpoint);
    } catch {
      recordEndpointFailure(endpoint);
    }
  }

  // Also query public Invidious instances
  const invidiousCandidates = [
    'https://yewtu.be',
    'https://inv.nadeko.net',
    'https://invidious.nerdvpn.de',
  ];

  for (const inv of invidiousCandidates) {
    if (!isEndpointHealthy(inv)) continue;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const res = await fetch(`${inv}/api/v1/videos/${videoId}`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = (await res.json()) as any;
        if (data.adaptiveFormats && Array.isArray(data.adaptiveFormats)) {
          const audioFormats = data.adaptiveFormats
            .filter((f: any) => (f.type?.includes('audio') || f.mimeType?.includes('audio')) && f.url)
            .sort((a: any, b: any) => (parseInt(b.bitrate, 10) || 0) - (parseInt(a.bitrate, 10) || 0));
          if (audioFormats.length > 0) {
            recordEndpointSuccess(inv);
            console.log(`[Tier 1: Invidious] Resolved real stream from ${inv} for ${videoId}`);
            return { url: audioFormats[0].url, mimeType: audioFormats[0].type || audioFormats[0].mimeType || 'audio/webm' };
          }
        }
      }
      recordEndpointFailure(inv);
    } catch {
      recordEndpointFailure(inv);
    }
  }

  return null;
}

// Resolve audio stream via yt-dlp with web_safari,tv_embedded,android,web client args & browser spoofing (Tier 2)
async function resolveYtDlpStream(videoId: string): Promise<string | null> {
  if (!isValidYouTubeId(videoId)) {
    return null;
  }

  const bin = await ensureYtDlpBinary();
  if (!bin) {
    return null;
  }

  return new Promise((resolve) => {
    try {
      const ytdlpProcess = child_process.spawn(
        bin,
        [
          `https://www.youtube.com/watch?v=${videoId}`,
          '-g',
          '-f',
          'ba[acodec=opus]/ba[acodec=mp4a]/ba',
          '--extractor-args',
          'youtube:player_client=web_safari,tv_embedded,android,web',
          '--user-agent',
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          '--referer',
          'https://www.youtube.com/',
          '--no-warnings',
        ],
        { timeout: 7000 }
      );

      let stdout = '';

      ytdlpProcess.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });

      ytdlpProcess.on('close', (code) => {
        if (code === 0 && stdout.trim().startsWith('http')) {
          const url = stdout.trim().split('\n')[0];
          console.log(`[Tier 2: yt-dlp] Resolved direct audio stream for ${videoId}`);
          resolve(url);
        } else {
          console.log(`[Tier 2: yt-dlp] Advancing to full-song cache/fallback for ${videoId}`);
          resolve(null);
        }
      });

      ytdlpProcess.on('error', () => {
        resolve(null);
      });
    } catch {
      resolve(null);
    }
  });
}

// Helper to serve local file with HTTP Range support and honest stream type
function serveFileWithRange(req: Request, res: Response, filePath: string, streamType: 'real' | 'fallback' = 'real') {
  try {
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;
    const contentType = detectMimeType(filePath);

    const commonHeaders: Record<string, string> = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type, Accept',
      'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length, Content-Type, X-Stream-Type',
      'Accept-Ranges': 'bytes',
      'X-Stream-Type': streamType,
      'Cache-Control': 'public, max-age=86400',
    };

    if (req.method === 'HEAD') {
      res.writeHead(200, {
        ...commonHeaders,
        'Content-Length': String(fileSize),
        'Content-Type': contentType,
      });
      res.end();
      return;
    }

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize) {
        res.status(416).set({ ...commonHeaders, 'Content-Range': `bytes */${fileSize}` }).send();
        return;
      }

      const chunkSize = end - start + 1;
      res.writeHead(206, {
        ...commonHeaders,
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Content-Length': String(chunkSize),
        'Content-Type': contentType,
      });

      const stream = fs.createReadStream(filePath, { start, end });
      stream.on('error', (err) => {
        console.error('[Stream error]', err);
        if (!res.headersSent) res.status(500).end();
      });
      stream.pipe(res);
    } else {
      res.writeHead(200, {
        ...commonHeaders,
        'Content-Length': String(fileSize),
        'Content-Type': contentType,
      });

      const stream = fs.createReadStream(filePath);
      stream.on('error', (err) => {
        console.error('[Stream error]', err);
        if (!res.headersSent) res.status(500).end();
      });
      stream.pipe(res);
    }
  } catch (err: any) {
    console.error('[serveFileWithRange error]', err);
    res.status(500).json({ error: 'Failed to stream audio file', message: err?.message });
  }
}

// Serve Fallback Audio File (Tier 3 - Honest Fallback: Never pre-seed audio_cache!)
function serveFallback(req: Request, res: Response, videoId: string) {
  console.log(`[yt-dlp] Extraction failed for ${videoId}. Serving fallback track.`);

  const fallbackFile = fs.existsSync(FALLBACK_OPUS)
    ? FALLBACK_OPUS
    : fs.existsSync(FALLBACK_MP3)
    ? FALLBACK_MP3
    : null;

  if (fallbackFile) {
    // CRITICAL: Do NOT copy fallbackFile into CACHE_DIR/${videoId}.opus!
    // Maintain honest cache so real audio is never masqueraded.
    return serveFileWithRange(req, res, fallbackFile, 'fallback');
  }

  res.status(404).json({ error: 'Audio unavailable and fallback not found' });
}

// -------------------------------------------------------------
// REST API Endpoints
// -------------------------------------------------------------

// 1. GET /api/ping
app.get('/api/ping', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    host: os.hostname(),
    timestamp: new Date().toISOString(),
  });
});

// 2. GET /api/version
app.get('/api/version', (req: Request, res: Response) => {
  res.json({
    version: '2.1.0',
    engine: 'yt-dlp-exec (best audio -f ba)',
    cache_dir: CACHE_DIR,
  });
});

// Curated discography tracks with guaranteed high-fidelity cached opus files
const curatedFallbackTracks = [
  { video_id: 'bbVZo4Yw7pI', title: 'Lonely At The Top', artist: 'Asake', album: 'Work of Art', duration: 158, thumbnail: 'https://i.ytimg.com/vi/bbVZo4Yw7pI/hqdefault.jpg' },
  { video_id: '421w1j87fEM', title: 'Last Last', artist: 'Burna Boy', album: 'Love, Damini', duration: 172, thumbnail: 'https://i.ytimg.com/vi/421w1j87fEM/hqdefault.jpg' },
  { video_id: 'Or2sMfOcTtw', title: 'Inauma', artist: 'Bien', album: 'Alusa Why Are You Top-less?', duration: 216, thumbnail: 'https://i.ytimg.com/vi/Or2sMfOcTtw/hqdefault.jpg' },
  { video_id: 'mFBJtuQ1Llc', title: 'Suzanna', artist: 'Sauti Sol', album: 'Midnight Train', duration: 231, thumbnail: 'https://i.ytimg.com/vi/mFBJtuQ1Llc/hqdefault.jpg' },
  { video_id: 'crtQSTYWtqE', title: 'Rush', artist: 'Ayra Starr', album: '19 & Dangerous', duration: 185, thumbnail: 'https://i.ytimg.com/vi/crtQSTYWtqE/hqdefault.jpg' },
  { video_id: '1JltlSJH5bY', title: 'Me & U', artist: 'Tems', album: 'Born in the Wild', duration: 212, thumbnail: 'https://i.ytimg.com/vi/1JltlSJH5bY/hqdefault.jpg' },
  { video_id: 'T6eK-2OQtew', title: 'Not Like Us', artist: 'Kendrick Lamar', album: 'Single', duration: 274, thumbnail: 'https://i.ytimg.com/vi/T6eK-2OQtew/hqdefault.jpg' },
  { video_id: '4NRXx6U8ABQ', title: 'Blinding Lights', artist: 'The Weeknd', album: 'After Hours', duration: 200, thumbnail: 'https://i.ytimg.com/vi/4NRXx6U8ABQ/hqdefault.jpg' },
  { video_id: 'uxpDa-c-4Mc', title: 'Passionfruit', artist: 'Drake', album: 'More Life', duration: 298, thumbnail: 'https://i.ytimg.com/vi/uxpDa-c-4Mc/hqdefault.jpg' },
  { video_id: 'B9synWjqBn8', title: 'FE!N', artist: 'Travis Scott ft. Playboi Carti', album: 'UTOPIA', duration: 191, thumbnail: 'https://i.ytimg.com/vi/B9synWjqBn8/hqdefault.jpg' },
  { video_id: 'QtrUp3-HLkw', title: 'Dimension', artist: 'Bien ft. Fully Focus', album: 'Single', duration: 182, thumbnail: 'https://i.ytimg.com/vi/QtrUp3-HLkw/hqdefault.jpg' },
  { video_id: 'prmmCg5bKxA', title: 'Melanin', artist: 'Sauti Sol ft. Patoranking', album: 'Afrikan Sauce', duration: 224, thumbnail: 'https://i.ytimg.com/vi/prmmCg5bKxA/hqdefault.jpg' },
  { video_id: 'WcIcVapfqXw', title: 'Calm Down', artist: 'Rema', album: 'Rave & Closes', duration: 220, thumbnail: 'https://i.ytimg.com/vi/WcIcVapfqXw/hqdefault.jpg' },
  { video_id: '9ClYy0MxsU0', title: 'Vossi Bop', artist: 'Stormzy', album: 'Heavy Is the Head', duration: 199, thumbnail: 'https://i.ytimg.com/vi/9ClYy0MxsU0/hqdefault.jpg' },
  { video_id: 'dQw4w9WgXcQ', title: 'Never Gonna Give You Up', artist: 'Rick Astley', album: 'Whenever You Need Somebody', duration: 213, thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg' }
];

const FEATURED_ARTISTS = [
  {
    name: 'Stormzy',
    monthly_listeners: '11,800,000',
    origin: 'London, United Kingdom',
    bio: 'Heavyweight British grime, drill, and hip-hop titan whose Glastonbury headlining set and epochal anthems made history.',
    image: 'https://i.ytimg.com/vi/9ClYy0MxsU0/hqdefault.jpg',
  },
  {
    name: 'Bien',
    monthly_listeners: '2,481,200',
    origin: 'Nairobi, Kenya',
    bio: 'East African soul royalty and frontman of Sauti Sol, leading global Afro-pop with irresistible acoustic harmonics.',
    image: 'https://i.ytimg.com/vi/Or2sMfOcTtw/hqdefault.jpg',
  },
  {
    name: 'Sauti Sol',
    monthly_listeners: '3,120,500',
    origin: 'Nairobi, Kenya',
    bio: 'Grammy-certified collective that revolutionized East African soul music and international touring.',
    image: 'https://i.ytimg.com/vi/mFBJtuQ1Llc/hqdefault.jpg',
  },
  {
    name: 'Burna Boy',
    monthly_listeners: '18,400,000',
    origin: 'Port Harcourt, Nigeria',
    bio: 'Grammy-winning African Giant whose polyrhythmic Afro-fusion fills global stadiums.',
    image: 'https://i.ytimg.com/vi/421w1j87fEM/hqdefault.jpg',
  },
  {
    name: 'Ayra Starr',
    monthly_listeners: '12,950,000',
    origin: 'Cotonou, Benin / Lagos, Nigeria',
    bio: 'Celestial sensation captivating audiences globally with crystalline vocals and infectious hit anthems.',
    image: 'https://i.ytimg.com/vi/crtQSTYWtqE/hqdefault.jpg',
  },
  {
    name: 'Asake',
    monthly_listeners: '9,840,000',
    origin: 'Lagos, Nigeria',
    bio: 'Mr. Money with the vibe — uniting Fuji street-pop cadences with thunderous Amapiano basslines.',
    image: 'https://i.ytimg.com/vi/bbVZo4Yw7pI/hqdefault.jpg',
  },
  {
    name: 'Tems',
    monthly_listeners: '14,600,000',
    origin: 'Lagos, Nigeria',
    bio: 'Grammy and Oscar-nominated visionary whose evocative contralto redefined modern Alté and R&B.',
    image: 'https://i.ytimg.com/vi/1JltlSJH5bY/hqdefault.jpg',
  },
  {
    name: 'Kendrick Lamar',
    monthly_listeners: '64,200,000',
    origin: 'Compton, California',
    bio: 'Pulitzer Prize recipient and master of lyrical architecture and cultural commentary.',
    image: 'https://i.ytimg.com/vi/T6eK-2OQtew/hqdefault.jpg',
  },
  {
    name: 'The Weeknd',
    monthly_listeners: '108,000,000',
    origin: 'Toronto, Canada',
    bio: 'Abel Tesfaye created an epochal body of work across dark R&B, synthwave, and stadium pop.',
    image: 'https://i.ytimg.com/vi/4NRXx6U8ABQ/hqdefault.jpg',
  },
  {
    name: 'Drake',
    monthly_listeners: '78,400,000',
    origin: 'Toronto, Canada',
    bio: 'Chart-dominating global icon spanning melodic rap, dancehall, and cross-continental rhythms.',
    image: 'https://i.ytimg.com/vi/uxpDa-c-4Mc/hqdefault.jpg',
  },
  {
    name: 'Travis Scott',
    monthly_listeners: '67,100,000',
    origin: 'Houston, Texas',
    bio: 'Architect of psychedelic stadium trap and maximalist cinematic audio experiences.',
    image: 'https://i.ytimg.com/vi/B9synWjqBn8/hqdefault.jpg',
  },
];

// GET /api/trending
app.get('/api/trending', (req: Request, res: Response) => {
  res.json(curatedFallbackTracks);
});

// Canonical Artist Name & Track Title Sanitizers + Portrait Resolution (Deezer High-Res Artist Portraits)
function normalizeArtistKey(name: string): string {
  return (name || '').replace(/_/g, ' ').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function cleanArtistDisplayName(name: string): string {
  return (name || '')
    .replace(/_/g, ' ')
    .replace(/\s*-\s*Topic$/i, '')
    .replace(/\bVEVO$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanTrackTitle(title: string, artistName?: string): string {
  let t = (title || '')
    .replace(/\[[^\]]*(official|music\s*video|lyric|audio|explicit|promo|hd|4k|visualizer)[^\]]*\]/gi, '')
    .replace(/\([^\)]*(official|music\s*video|lyric|audio|explicit|promo|hd|4k|visualizer)[^\)]*\)/gi, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (artistName) {
    const escapedArtist = cleanArtistDisplayName(artistName).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const prefixRegex = new RegExp(`^${escapedArtist}\\s*[-–—:]\\s*`, 'i');
    t = t.replace(prefixRegex, '').trim();
  }
  return t || title;
}

function isCompoundArtistCredit(candidateName: string, rawQuery: string): boolean {
  const cleanCandidate = cleanArtistDisplayName(candidateName);
  const qLower = (rawQuery || '').toLowerCase();

  // Reject composer/initial lists like "P. Nasty C. ..." or "J. Cole, ..." when not searched
  if (/^[A-Z]\.\s+[A-Z]/i.test(cleanCandidate) && !/^[a-z]\.\s+/i.test(qLower)) {
    const withoutLeadingInitial = cleanCandidate.replace(/^[A-Z]\.\s+/i, '');
    if (normalizeArtistKey(withoutLeadingInitial).includes(normalizeArtistKey(rawQuery))) {
      return true;
    }
  }
  if (cleanCandidate.endsWith('.') && cleanCandidate.split('.').length >= 3) {
    return true;
  }

  // Reject multi-artist collaboration strings (",", "&", "feat", "ft.", "vs", " and ") unless query includes them
  if (cleanCandidate.includes(',') && !qLower.includes(',')) return true;
  if (cleanCandidate.includes(' & ') && !qLower.includes('&')) return true;
  if (cleanCandidate.includes(' / ') && !qLower.includes('/')) return true;
  if (/\b(feat\.?|ft\.?|vs\.?|with)\b/i.test(cleanCandidate) && !/\b(feat|ft|vs|with)\b/i.test(qLower)) {
    return true;
  }
  if (/\band\b/i.test(cleanCandidate) && !/\band\b/i.test(qLower)) {
    return true;
  }

  return false;
}

function formatListenersFromFans(fans?: number): string {
  if (!fans || fans <= 0) return '1.2M';
  const estimatedMonthly = Math.max(Math.round(fans * 4.5), 45000);
  if (estimatedMonthly >= 1_000_000) {
    return `${(estimatedMonthly / 1_000_000).toFixed(1)}M`;
  }
  return `${Math.round(estimatedMonthly / 1_000)}K`;
}

const artistPortraitCache = new Map<
  string,
  { expiresAt: number; image: string; monthly_listeners?: string }
>();

async function fetchCanonicalArtistPortrait(
  artistName: string
): Promise<{ image: string; monthly_listeners?: string }> {
  const cleanName = cleanArtistDisplayName(artistName);
  const targetNorm = normalizeArtistKey(cleanName);
  if (!targetNorm) return { image: '' };

  const cached = artistPortraitCache.get(targetNorm);
  if (cached && cached.expiresAt > Date.now()) {
    return { image: cached.image, monthly_listeners: cached.monthly_listeners };
  }

  try {
    const res = await fetch(
      `https://api.deezer.com/search/artist?q=${encodeURIComponent(cleanName)}&limit=10`,
      { signal: AbortSignal.timeout(3500) }
    );
    if (res.ok) {
      const data = (await res.json()) as any;
      const items: any[] = Array.isArray(data?.data) ? data.data : [];

      const validItems = items.filter((item) => {
        const pic = item.picture_xl || item.picture_big || item.picture_medium || '';
        return pic && !pic.includes('/images/artist//');
      });

      // Prefer exact normalized alphanumeric match with the highest fan count (so "Nasty C" 333k beats "Nasty_C" 16k)
      const exactMatches = validItems
        .filter((item) => normalizeArtistKey(item.name) === targetNorm)
        .sort((a, b) => (b.nb_fan || 0) - (a.nb_fan || 0));

      const partialMatches = validItems
        .filter(
          (item) =>
            normalizeArtistKey(item.name).includes(targetNorm) ||
            targetNorm.includes(normalizeArtistKey(item.name))
        )
        .sort((a, b) => (b.nb_fan || 0) - (a.nb_fan || 0));

      const chosen = exactMatches[0] || partialMatches[0] || validItems[0];
      if (chosen) {
        const image = chosen.picture_xl || chosen.picture_big || chosen.picture_medium || '';
        const monthly_listeners = formatListenersFromFans(chosen.nb_fan);
        artistPortraitCache.set(targetNorm, {
          expiresAt: Date.now() + 60 * 60 * 1000,
          image,
          monthly_listeners,
        });
        return { image, monthly_listeners };
      }
    }
  } catch {}

  return { image: '' };
}

// 3. GET /api/search?q=<query> (Intent-Aware: Canonical Artist & Song Resolution)
app.get('/api/search', async (req: Request, res: Response) => {
  const query = ((req.query.q as string) || '').trim();
  if (!query) {
    return res.json({
      query: '',
      topResult: null,
      artists: FEATURED_ARTISTS.map((a) => ({
        id: a.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        name: a.name,
        image: a.image,
        monthly_listeners: a.monthly_listeners,
        origin: a.origin,
        bio: a.bio,
      })),
      songs: curatedFallbackTracks,
      albums: [],
    });
  }

  const cleanQ = cleanArtistDisplayName(query).toLowerCase();
  const normQ = normalizeArtistKey(query);

  // 1. Fetch canonical iTunes songs, artists, albums, and YouTube IDs concurrently
  const [ytSongs, itunesSongs, itunesArtists, itunesAlbums] = await Promise.all([
    searchYouTubeVideos(query).catch(() => null),
    fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=25`)
      .then((r) => r.json())
      .then((d: any) => d.results || [])
      .catch(() => []),
    fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=musicArtist&limit=10`)
      .then((r) => r.json())
      .then((d: any) => d.results || [])
      .catch(() => []),
    fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=album&limit=12`)
      .then((r) => r.json())
      .then((d: any) => d.results || [])
      .catch(() => []),
  ]);

  // 2. Construct Canonical Songs list from iTunes metadata first (avoiding raw YouTube titles/channel names)
  let songs: any[] = [];
  const seenSongKeys = new Set<string>();

  if (Array.isArray(itunesSongs) && itunesSongs.length > 0) {
    for (const s of itunesSongs) {
      const rawTitle = (s.trackName || '').trim();
      const rawArtist = cleanArtistDisplayName(s.artistName || query);
      if (!rawTitle) continue;
      if (/\b(karaoke|tribute|ringtone|made famous by|instrumental version)\b/i.test(rawTitle)) {
        continue;
      }

      const dedupeKey = `${normalizeArtistKey(rawTitle)}::${normalizeArtistKey(rawArtist.split(/[,&]/)[0])}`;
      if (seenSongKeys.has(dedupeKey)) continue;
      seenSongKeys.add(dedupeKey);

      // Check if ytSongs already found a matching 11-char YouTube video_id for this track title
      const normTitle = normalizeArtistKey(rawTitle);
      const matchedYt = Array.isArray(ytSongs)
        ? ytSongs.find((yt: any) => {
            const ytNorm = normalizeArtistKey(yt.title || '');
            return ytNorm && normTitle && (ytNorm.includes(normTitle) || normTitle.includes(ytNorm));
          })
        : null;

      songs.push({
        id: String(s.trackId || Math.random()),
        video_id: matchedYt && isValidYouTubeId(matchedYt.video_id) ? matchedYt.video_id : '',
        title: rawTitle,
        artist: rawArtist,
        album: (s.collectionName || 'Single').replace(/\s*-\s*(Single|EP)$/i, '').trim(),
        duration: Math.round((s.trackTimeMillis || 210000) / 1000),
        thumbnail: (s.artworkUrl100 || '').replace('100x100bb', '600x600bb'),
      });
    }

    // Ensure the top 4 songs have pre-resolved 11-char YouTube video_ids for instant playback
    const topSlice = songs.slice(0, 4);
    await mapWithConcurrency(topSlice, 3, async (song) => {
      if (!song.video_id || !isValidYouTubeId(song.video_id)) {
        const resolvedId = await resolveYouTubeVideoId(
          `${song.title} ${song.artist} official audio`
        ).catch(() => null);
        if (resolvedId && isValidYouTubeId(resolvedId)) {
          song.video_id = resolvedId;
        }
      }
      return song;
    });
  }

  // Fallback to sanitized YouTube results only if iTunes returned zero songs
  if (songs.length === 0 && Array.isArray(ytSongs) && ytSongs.length > 0) {
    songs = ytSongs.map((yt: any) => {
      const cleanedArtist = cleanArtistDisplayName(yt.artist || query);
      return {
        ...yt,
        id: yt.video_id,
        title: cleanTrackTitle(yt.title, cleanedArtist),
        artist: cleanedArtist,
      };
    });
  }

  if (songs.length === 0) {
    const filtered = curatedFallbackTracks.filter(
      (t) =>
        t.title.toLowerCase().includes(cleanQ) ||
        t.artist.toLowerCase().includes(cleanQ) ||
        t.album.toLowerCase().includes(cleanQ)
    );
    songs = filtered.length > 0 ? filtered : curatedFallbackTracks;
  }

  // 3. Construct Clean, Deduplicated Artists list (no underscore duplicates or collaboration credit strings)
  const artistsMap = new Map<string, any>();

  // A. Check curated FEATURED_ARTISTS
  for (const fa of FEATURED_ARTISTS) {
    const faNorm = normalizeArtistKey(fa.name);
    if (faNorm.includes(normQ) || normQ.includes(faNorm)) {
      artistsMap.set(faNorm, {
        id: fa.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        name: fa.name,
        image: fa.image,
        monthly_listeners: fa.monthly_listeners,
        origin: fa.origin,
        bio: fa.bio,
      });
    }
  }

  // B. Add canonical iTunes artists (normalizing underscores & filtering out compound credits)
  for (const ia of itunesArtists) {
    const rawName = ia.artistName;
    if (!rawName) continue;
    if (isCompoundArtistCredit(rawName, query)) continue;

    const cleanName = cleanArtistDisplayName(rawName);
    const normKey = normalizeArtistKey(cleanName);
    if (!normKey) continue;

    // Prefer the clean spelling without underscores if already present
    if (!artistsMap.has(normKey)) {
      const matchingAlbum = (itunesAlbums || []).find(
        (alb: any) => normalizeArtistKey(alb.artistName || '') === normKey
      );
      const albumArt = matchingAlbum?.artworkUrl100
        ? matchingAlbum.artworkUrl100.replace('100x100bb', '600x600bb')
        : '';

      artistsMap.set(normKey, {
        id: String(ia.artistId || cleanName.toLowerCase().replace(/[^a-z0-9]/g, '-')),
        name: cleanName,
        image: albumArt,
        monthly_listeners: '',
        origin: ia.primaryGenreName || 'Global',
        bio: `${cleanName} is an internationally acclaimed ${ia.primaryGenreName || 'recording'} artist.`,
      });
    }
  }

  // C. Fallback: synthesize primary artist from top song if still empty
  if (artistsMap.size === 0 && songs.length > 0) {
    const primaryArtist = cleanArtistDisplayName(songs[0].artist.split(/[,&]/)[0]);
    const normKey = normalizeArtistKey(primaryArtist);
    if (primaryArtist && normKey) {
      artistsMap.set(normKey, {
        id: primaryArtist.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        name: primaryArtist,
        image: songs[0].thumbnail || '',
        monthly_listeners: '',
        origin: 'Global',
        bio: `${primaryArtist} official recording catalog.`,
      });
    }
  }

  // D. Enrich candidate artists with real high-res portraits & fan-based listener counts from Deezer
  const rawArtists = Array.from(artistsMap.values()).slice(0, 6);
  const artists = await mapWithConcurrency(rawArtists, 4, async (art) => {
    const portrait = await fetchCanonicalArtistPortrait(art.name);
    return {
      ...art,
      image: portrait.image || art.image || '',
      monthly_listeners: art.monthly_listeners || portrait.monthly_listeners || '1.2M',
    };
  });

  // 4. Construct Clean Albums list (deduplicated by normalized title)
  const seenAlbumKeys = new Set<string>();
  const albums: any[] = [];
  for (const alb of itunesAlbums || []) {
    const rawTitle = (alb.collectionName || 'Album').replace(/\s*-\s*(Single|EP)$/i, '').trim();
    const rawArtist = cleanArtistDisplayName(alb.artistName || 'Artist');
    const albKey = `${normalizeArtistKey(rawTitle)}::${normalizeArtistKey(rawArtist)}`;
    if (seenAlbumKeys.has(albKey)) continue;
    seenAlbumKeys.add(albKey);

    albums.push({
      id: String(alb.collectionId || Math.random()),
      title: rawTitle,
      artist: rawArtist,
      year: alb.releaseDate ? new Date(alb.releaseDate).getFullYear() : 'Album',
      thumbnail: alb.artworkUrl100
        ? alb.artworkUrl100.replace('100x100bb', '600x600bb')
        : songs[0]?.thumbnail || '',
      track_count: alb.trackCount || 1,
    });
  }

  // 5. Determine Intent: Artist vs. Song
  let topResult: any = null;

  const exactArtist = artists.find((a: any) => normalizeArtistKey(a.name) === normQ);
  const startsArtist = artists.find(
    (a: any) =>
      normalizeArtistKey(a.name).startsWith(normQ) || normQ.startsWith(normalizeArtistKey(a.name))
  );
  const matchingArtist = exactArtist || startsArtist;

  const isSongTitleIntent =
    cleanQ.includes('remix') ||
    cleanQ.includes('feat') ||
    cleanQ.includes('ft.') ||
    cleanQ.includes('official audio') ||
    cleanQ.includes('video');

  if (matchingArtist && !isSongTitleIntent) {
    topResult = {
      type: 'artist',
      id: matchingArtist.id,
      name: matchingArtist.name,
      image: matchingArtist.image,
      subtitle: 'Artist',
      monthly_listeners: matchingArtist.monthly_listeners,
      origin: matchingArtist.origin,
      bio: matchingArtist.bio,
      topTrack: songs[0],
    };
  } else if (songs.length > 0) {
    topResult = {
      type: 'song',
      id: songs[0].video_id || songs[0].id,
      video_id: songs[0].video_id,
      title: songs[0].title,
      name: songs[0].title,
      artist: songs[0].artist,
      image: songs[0].thumbnail,
      thumbnail: songs[0].thumbnail,
      duration: songs[0].duration,
      subtitle: `Song • ${songs[0].artist}`,
      topTrack: songs[0],
    };
  }

  res.json({
    query,
    topResult,
    artists,
    songs,
    albums,
  });
});

// 4. HEAD /api/stream/:video_id (HEAD should not burn Tier 1 quota — cached or unknown only)
app.head('/api/stream/:video_id', async (req: Request, res: Response) => {
  const { video_id } = req.params;
  const title = req.query.title as string | undefined;
  const artist = req.query.artist as string | undefined;
  const prewarm = req.query.prewarm as string | undefined;

  let targetId = video_id;
  if (!isValidYouTubeId(targetId)) {
    const query = [artist, title].filter(Boolean).join(' ');
    const resolved = await resolveYouTubeVideoId(query);
    if (resolved && isValidYouTubeId(resolved)) targetId = resolved;
  }

  if (prewarm) {
    const prewarmIds = prewarm.split(',').filter(Boolean);
    prewarmQueue(prewarmIds);
  }

  const cachedFile = findCachedTrack(targetId);
  if (cachedFile) {
    return serveFileWithRange(req, res, cachedFile, 'real');
  }

  // Unknown — do NOT hit Piped just to answer HEAD
  res.writeHead(200, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Expose-Headers': 'X-Stream-Type',
    'X-Stream-Type': 'unknown',
    'Content-Type': 'audio/webm',
  });
  res.end();
});

// 4. GET /api/stream/:video_id (Full-Song Fast Cache + 3-Tier Real Stream Extraction & Range Seeking)
app.get('/api/stream/:video_id', async (req: Request, res: Response) => {
  const { video_id } = req.params;
  const title = req.query.title as string | undefined;
  const artist = req.query.artist as string | undefined;
  const prewarm = req.query.prewarm as string | undefined;

  // Resolve non-standard IDs (e.g., numeric iTunes IDs like 1692311925) to valid 11-char YouTube IDs
  let targetId = video_id;
  if (!isValidYouTubeId(targetId)) {
    console.log(`[Stream] Non-standard ID "${targetId}" received. Resolving genuine YouTube ID...`);
    const searchQuery = [artist, title].filter(Boolean).join(' ') || targetId;
    const resolved = await resolveYouTubeVideoId(searchQuery);
    if (resolved && isValidYouTubeId(resolved)) {
      console.log(`[Stream] Resolved non-standard ID "${targetId}" -> YouTube ID "${resolved}"`);
      targetId = resolved;
    }
  }

  // Prewarm next tracks in background if requested
  if (prewarm) {
    const prewarmIds = prewarm.split(',').filter(Boolean);
    prewarmQueue(prewarmIds);
  }

  // 0. If already legitimately cached on disk, serve directly with Range support
  const cachedFile = findCachedTrack(targetId);
  if (cachedFile) {
    return serveFileWithRange(req, res, cachedFile, 'real');
  }

  const knownTrack = curatedFallbackTracks.find((t) => t.video_id === targetId || t.video_id === video_id);
  const resolvedTitle = title || knownTrack?.title;
  const resolvedArtist = artist || knownTrack?.artist;

  // If targetId is a valid 11-char YouTube ID, try Tier 1 & Tier 2 with background cache-on-play
  if (isValidYouTubeId(targetId)) {
    // TIER 1: Public Invidious / Piped API (circuit-breaker protected)
    try {
      const pipedStream = await resolvePipedAudioStream(targetId);
      if (pipedStream && pipedStream.url) {
        fetchAndCacheRealAudio(targetId, resolvedTitle, resolvedArtist).catch(() => {});
        return await proxyStreamUrl(req, res, pipedStream.url, pipedStream.mimeType);
      }
    } catch (err: any) {
      console.warn(`[Tier 1] Public instance query error for ${targetId}:`, err?.message);
    }

    // TIER 2: yt-dlp with web_safari,tv_embedded,android,web client args & browser spoofing
    try {
      const ytdlpStreamUrl = await resolveYtDlpStream(targetId);
      if (ytdlpStreamUrl) {
        // after Tier 2 succeeds and before proxy — kick off persistent cache in background
        if (isValidYouTubeId(targetId)) {
          fetchAndCacheRealAudio(targetId, resolvedTitle, resolvedArtist).catch(() => {});
        }
        return await proxyStreamUrl(req, res, ytdlpStreamUrl, 'audio/webm');
      }
    } catch (err: any) {
      console.warn(`[Tier 2] yt-dlp execution error for ${targetId}:`, err?.message);
    }
  } else {
    console.warn(`[Stream] Could not resolve a valid YouTube ID for "${video_id}". Bypassing yt-dlp to avoid truncation error.`);
  }

  // Real byte download & full-song cache (serves play 1 if proxy tiers were blocked, and play 2+ directly from disk)
  try {
    const realFile = await fetchAndCacheRealAudio(targetId, resolvedTitle, resolvedArtist);
    if (realFile && fs.existsSync(realFile)) {
      return serveFileWithRange(req, res, realFile, 'real');
    }
  } catch {}

  // TIER 3: The Honest Fallback (Never seed fake audio into audio_cache/)
  serveFallback(req, res, targetId);
});

// 5. GET /api/featured_artists
app.get('/api/featured_artists', (req: Request, res: Response) => {
  res.json(FEATURED_ARTISTS);
});

// Bounded concurrency helper (limits parallel YouTube ID resolutions to avoid rate limits)
const YT_RESOLVE_CONCURRENCY = 3;
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const current = nextIndex++;
      results[current] = await worker(items[current], current);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => runWorker());
  await Promise.all(workers);
  return results;
}

// 1-hour in-memory caches for canonical iTunes artist discographies and album tracklists
const ITUNES_CACHE_TTL_MS = 60 * 60 * 1000;
const artistDiscographyCache = new Map<string, { expiresAt: number; payload: any }>();
const albumTracklistCache = new Map<string, { expiresAt: number; payload: any }>();

// 6. GET /api/artist/:name/tracks (Canonical Apple Music / iTunes Entity Resolution + Deezer Portrait + Concurrency-3 YouTube ID Lookup)
app.get('/api/artist/:name/tracks', async (req: Request, res: Response) => {
  const { name } = req.params;
  const decodedName = cleanArtistDisplayName(decodeURIComponent(name));
  const lowerName = decodedName.toLowerCase();
  const normTarget = normalizeArtistKey(decodedName);

  // Serve from 1-hour in-memory cache if fresh
  const cachedEntry = artistDiscographyCache.get(normTarget);
  if (cachedEntry && cachedEntry.expiresAt > Date.now()) {
    return res.json(cachedEntry.payload);
  }

  try {
    // Step A (Resolve Entity): Fetch musicArtist entities from iTunes + Portrait from Deezer in parallel
    const [artistRes, portraitData] = await Promise.all([
      fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(decodedName)}&entity=musicArtist&limit=10`
      ),
      fetchCanonicalArtistPortrait(decodedName),
    ]);
    const artistJson = artistRes.ok ? ((await artistRes.json()) as any) : { results: [] };
    const artistResults: any[] = (artistJson.results || []).filter(
      (a: any) => !isCompoundArtistCredit(a.artistName || '', decodedName)
    );

    const exactArtist =
      artistResults.find(
        (a) => (a.artistName || '').trim().toLowerCase() === lowerName && !a.artistName.includes('_')
      ) ||
      artistResults.find((a) => normalizeArtistKey(a.artistName || '') === normTarget) ||
      artistResults[0];

    if (!exactArtist || !exactArtist.artistId) {
      return res.json({
        artist: {
          id: lowerName.replace(/[^a-z0-9]/g, '-'),
          name: decodedName,
          genre: 'Music',
          image: portraitData.image || '',
          monthly_listeners: portraitData.monthly_listeners || '1.5M',
          origin: 'Global',
          bio: `${decodedName} official discography.`,
        },
        albums: [],
        singles_and_eps: [],
        top_tracks: [],
      });
    }

    const artistId = exactArtist.artistId;
    const canonicalArtistName: string = cleanArtistDisplayName(exactArtist.artistName || decodedName);
    const primaryGenreName: string = exactArtist.primaryGenreName || 'Music';

    // Step B (Fetch Albums & Career-Wide Popular Songs in parallel):
    const [albumsRes, popularSongsRes] = await Promise.all([
      fetch(
        `https://itunes.apple.com/lookup?id=${encodeURIComponent(String(artistId))}&entity=album&limit=50`
      ),
      fetch(
        `https://itunes.apple.com/lookup?id=${encodeURIComponent(String(artistId))}&entity=song&limit=25`
      ),
    ]);

    const albumsJson = albumsRes.ok ? ((await albumsRes.json()) as any) : { results: [] };
    const rawCollections: any[] = (albumsJson.results || []).filter(
      (r: any) => r.wrapperType === 'collection' && r.collectionId
    );

    // Sort collections by releaseDate descending
    rawCollections.sort((a, b) => {
      const tA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
      const tB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
      return tB - tA;
    });

    const albums: any[] = [];
    const singlesAndEps: any[] = [];
    const seenCollectionKeys = new Set<string>();

    for (const col of rawCollections) {
      const title: string = col.collectionName || 'Album';
      const cleanColTitle = title.replace(/\s*-\s*(Single|EP)$/i, '').trim();
      const colKey = normalizeArtistKey(cleanColTitle);
      if (seenCollectionKeys.has(colKey)) continue;
      seenCollectionKeys.add(colKey);

      const isSingleOrEp =
        /\b(single|ep)\b/i.test(title) ||
        /- single$/i.test(title) ||
        /- ep$/i.test(title) ||
        (typeof col.trackCount === 'number' && col.trackCount <= 3);

      const formattedAlbum = {
        id: String(col.collectionId),
        title: cleanColTitle,
        artist: cleanArtistDisplayName(col.artistName || canonicalArtistName),
        year: col.releaseDate ? new Date(col.releaseDate).getFullYear() : 2024,
        release_date: col.releaseDate || '',
        track_count: col.trackCount || 1,
        thumbnail: (col.artworkUrl100 || '').replace('100x100bb', '600x600bb'),
      };

      if (isSingleOrEp) {
        singlesAndEps.push(formattedAlbum);
      } else {
        albums.push(formattedAlbum);
      }
    }

    // Step C (Build Top Tracks): Prioritize career-wide top popular songs first, then supplement from top albums
    const seenTitles = new Set<string>();
    const candidateTracks: Array<{
      itunes_track_id: string;
      title: string;
      artist: string;
      album: string;
      duration: number;
      thumbnail: string;
    }> = [];

    if (popularSongsRes.ok) {
      const popData = (await popularSongsRes.json()) as any;
      for (const trk of (popData.results || []).filter((r: any) => r.wrapperType === 'track')) {
        const rawTitle = (trk.trackName || '').trim();
        const normKey = normalizeArtistKey(rawTitle);
        if (!rawTitle || seenTitles.has(normKey)) continue;
        seenTitles.add(normKey);

        candidateTracks.push({
          itunes_track_id: String(trk.trackId || Math.random()),
          title: rawTitle,
          artist: cleanArtistDisplayName(trk.artistName || canonicalArtistName),
          album: (trk.collectionName || 'Single').replace(/\s*-\s*(Single|EP)$/i, '').trim(),
          duration: Math.round((trk.trackTimeMillis || 210000) / 1000),
          thumbnail: (trk.artworkUrl100 || '').replace('100x100bb', '600x600bb'),
        });
      }
    }

    if (candidateTracks.length < 10) {
      const targetCollections = [...albums, ...singlesAndEps].slice(0, 3);
      const collectionTrackLookups = await Promise.all(
        targetCollections.map((col) =>
          fetch(`https://itunes.apple.com/lookup?id=${encodeURIComponent(col.id)}&entity=song`)
            .then((r) => (r.ok ? r.json() : { results: [] }))
            .then((d: any) => ({
              col,
              tracks: (d.results || []).filter((item: any) => item.wrapperType === 'track'),
            }))
            .catch(() => ({ col, tracks: [] }))
        )
      );

      for (const { col, tracks } of collectionTrackLookups) {
        for (const trk of tracks) {
          if (candidateTracks.length >= 10) break;
          const rawTitle = (trk.trackName || '').trim();
          if (!rawTitle) continue;
          const normKey = normalizeArtistKey(rawTitle);
          if (seenTitles.has(normKey)) continue;
          seenTitles.add(normKey);

          candidateTracks.push({
            itunes_track_id: String(trk.trackId || Math.random()),
            title: rawTitle,
            artist: cleanArtistDisplayName(trk.artistName || canonicalArtistName),
            album: (trk.collectionName || col.title).replace(/\s*-\s*(Single|EP)$/i, '').trim(),
            duration: Math.round((trk.trackTimeMillis || 210000) / 1000),
            thumbnail:
              (trk.artworkUrl100 || '').replace('100x100bb', '600x600bb') || col.thumbnail,
          });
        }
      }
    }

    const top10Candidates = candidateTracks.slice(0, 10);

    // Step D (Resolve to YouTube): Parallel resolution with concurrency limit = 3
    const topTracks = await mapWithConcurrency(
      top10Candidates,
      YT_RESOLVE_CONCURRENCY,
      async (song) => {
        const query = `${song.title} ${canonicalArtistName} official audio`;
        const videoId = await resolveYouTubeVideoId(query).catch(() => null);
        return {
          id: song.itunes_track_id,
          video_id: videoId && isValidYouTubeId(videoId) ? videoId : '',
          title: song.title,
          artist: song.artist,
          album: song.album,
          duration: song.duration,
          thumbnail: song.thumbnail, // Always use high-res 600x600 iTunes artwork
        };
      }
    );

    // Step E (Response): Build canonical artist profile payload (preferring genuine Deezer artist portrait over album covers)
    const featuredMeta = FEATURED_ARTISTS.find(
      (fa) => normalizeArtistKey(fa.name) === normalizeArtistKey(canonicalArtistName)
    );
    const canonicalImage =
      portraitData.image ||
      featuredMeta?.image ||
      albums[0]?.thumbnail ||
      singlesAndEps[0]?.thumbnail ||
      topTracks[0]?.thumbnail ||
      '';

    const payload = {
      artist: {
        id: String(artistId),
        name: canonicalArtistName,
        genre: primaryGenreName,
        image: canonicalImage,
        monthly_listeners:
          featuredMeta?.monthly_listeners || portraitData.monthly_listeners || '1.8M',
        origin: featuredMeta?.origin || primaryGenreName,
        bio:
          featuredMeta?.bio ||
          `${canonicalArtistName} is an acclaimed ${primaryGenreName} recording artist.`,
      },
      albums,
      singles_and_eps: singlesAndEps,
      top_tracks: topTracks,
    };

    artistDiscographyCache.set(normTarget, {
      expiresAt: Date.now() + ITUNES_CACHE_TTL_MS,
      payload,
    });
    artistDiscographyCache.set(normalizeArtistKey(canonicalArtistName), {
      expiresAt: Date.now() + ITUNES_CACHE_TTL_MS,
      payload,
    });

    return res.json(payload);
  } catch (err) {
    console.warn('[Artist Tracks] canonical lookup error:', err);
    return res.status(500).json({
      error: 'Failed to resolve canonical artist discography',
      artist: { name: decodedName, genre: 'Music', image: '' },
      albums: [],
      singles_and_eps: [],
      top_tracks: [],
    });
  }
});

// 6b. GET /api/album/:album_id/tracks (Canonical iTunes Album Tracklist Lookup — lazy video_id resolution)
app.get('/api/album/:album_id/tracks', async (req: Request, res: Response) => {
  const { album_id } = req.params;
  const artist = (req.query.artist as string) || '';
  const albumName = (req.query.album as string) || '';

  const cachedAlbum = albumTracklistCache.get(album_id);
  if (cachedAlbum && cachedAlbum.expiresAt > Date.now()) {
    return res.json(cachedAlbum.payload);
  }

  try {
    const resItunes = await fetch(
      `https://itunes.apple.com/lookup?id=${encodeURIComponent(album_id)}&entity=song`
    );
    if (resItunes.ok) {
      const data = (await resItunes.json()) as any;
      const results = data.results || [];
      const collection = results.find((r: any) => r.wrapperType === 'collection');
      const rawTracks = results.filter((r: any) => r.wrapperType === 'track');

      const albumArtwork = (collection?.artworkUrl100 || '').replace('100x100bb', '600x600bb');
      const resolvedAlbumTitle =
        (collection?.collectionName || albumName || 'Album')
          .replace(/\s*-\s*(Single|EP)$/i, '')
          .trim();
      const resolvedAlbumArtist = collection?.artistName || artist;

      // Do NOT resolve YouTube IDs on initial album load; return empty video_id for on-demand resolution
      const tracks = rawTracks.map((t: any, idx: number) => ({
        id: String(t.trackId || `${album_id}-${idx + 1}`),
        video_id: '',
        track_number: typeof t.trackNumber === 'number' ? t.trackNumber : idx + 1,
        title: t.trackName || `Track ${idx + 1}`,
        artist: t.artistName || resolvedAlbumArtist,
        album: resolvedAlbumTitle,
        duration: Math.round((t.trackTimeMillis || 210000) / 1000),
        thumbnail:
          (t.artworkUrl100 || '').replace('100x100bb', '600x600bb') || albumArtwork,
      }));

      if (tracks.length > 0) {
        const payload = {
          album: {
            id: album_id,
            title: resolvedAlbumTitle,
            artist: resolvedAlbumArtist,
            year: collection?.releaseDate ? new Date(collection.releaseDate).getFullYear() : 2024,
            track_count: tracks.length,
            thumbnail: albumArtwork || tracks[0]?.thumbnail || '',
          },
          tracks,
        };
        albumTracklistCache.set(album_id, {
          expiresAt: Date.now() + ITUNES_CACHE_TTL_MS,
          payload,
        });
        return res.json(payload);
      }
    }
  } catch (err) {
    console.warn('[Album Lookup] error:', err);
  }

  res.json({
    album: { id: album_id, title: albumName, artist, thumbnail: '', track_count: 0 },
    tracks: [],
  });
});

// 6c. GET /api/resolve_track (Resolve Title + Artist to 11-char YouTube ID)
app.get('/api/resolve_track', async (req: Request, res: Response) => {
  const title = ((req.query.title as string) || '').trim();
  const artist = ((req.query.artist as string) || '').trim();
  const baseQuery = [title, artist].filter(Boolean).join(' ').trim();

  if (!baseQuery) {
    return res.status(400).json({ error: 'Missing title or artist' });
  }

  const query = `${baseQuery} official audio`;

  try {
    const videoId = await resolveYouTubeVideoId(query);
    if (videoId && isValidYouTubeId(videoId)) {
      return res.json({
        video_id: videoId,
        thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      });
    }
  } catch (err: any) {
    console.warn('[Resolve Track] Error:', err?.message);
  }

  res.status(404).json({ error: 'Could not resolve track to YouTube video ID' });
});

// 6d. GET /api/lyrics (Real synchronized lyrics lookup via LRCLIB)
app.get('/api/lyrics', async (req: Request, res: Response) => {
  const title = ((req.query.title as string) || '').trim();
  const artist = ((req.query.artist as string) || '').trim();
  const cleanTitle = title.replace(/\(.*?\)|\[.*?\]|official\s*(music\s*)?video|official\s*audio|lyrics|ft\..*|feat\..*/gi, '').trim();
  const query = [artist, cleanTitle || title].filter(Boolean).join(' ');

  if (!query) {
    return res.json([]);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);
    const lrcRes = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(query)}`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'b33t-music-player/2.1.0' },
    });
    clearTimeout(timeout);

    if (lrcRes.ok) {
      const items = (await lrcRes.json()) as any[];
      if (Array.isArray(items) && items.length > 0) {
        const withSynced = items.find((it) => it.syncedLyrics);
        if (withSynced && typeof withSynced.syncedLyrics === 'string') {
          const parsedLines: Array<{ seconds: number; lyrics: string }> = [];
          const rawLines = withSynced.syncedLyrics.split('\n');
          for (const raw of rawLines) {
            const match = raw.match(/^\[(\d{1,2}):(\d{2}(?:\.\d{1,3})?)\]\s*(.*)$/);
            if (match) {
              const mins = parseInt(match[1], 10);
              const secs = parseFloat(match[2]);
              const text = match[3].trim();
              if (text) {
                parsedLines.push({
                  seconds: Math.round((mins * 60 + secs) * 10) / 10,
                  lyrics: text,
                });
              }
            }
          }
          if (parsedLines.length > 0) {
            return res.json(parsedLines);
          }
        }

        const withPlain = items.find((it) => it.plainLyrics);
        if (withPlain && typeof withPlain.plainLyrics === 'string') {
          const lines = withPlain.plainLyrics
            .split('\n')
            .map((l: string) => l.trim())
            .filter(Boolean);
          const dur = withPlain.duration || 180;
          const step = Math.max(4, Math.floor(dur / Math.max(1, lines.length)));
          return res.json(
            lines.map((line: string, i: number) => ({
              seconds: i * step,
              lyrics: line,
            }))
          );
        }
      }
    }
  } catch (err: any) {
    console.warn('[Lyrics API] lookup warning:', err?.message);
  }

  res.json([]);
});

// 7. GET /api/status/:video_id
app.get('/api/status/:video_id', (req: Request, res: Response) => {
  const { video_id } = req.params;
  const cachedFile = findCachedTrack(video_id);

  if (cachedFile && fs.existsSync(cachedFile)) {
    const stat = fs.statSync(cachedFile);
    res.json({
      cached: true,
      size_bytes: stat.size,
      path: cachedFile,
    });
  } else {
    res.json({
      cached: false,
      size_bytes: 0,
      path: null,
    });
  }
});

// 8. GET /api/cache
app.get('/api/cache', (req: Request, res: Response) => {
  try {
    const files = fs.readdirSync(CACHE_DIR).filter((f) =>
      AUDIO_EXTS.some((ext) => f.endsWith(ext))
    );
    let totalBytes = 0;
    const fileList = files.map((f) => {
      const fullPath = path.join(CACHE_DIR, f);
      const stat = fs.statSync(fullPath);
      totalBytes += stat.size;
      const video_id = f.slice(0, -path.extname(f).length);
      return {
        video_id,
        ext: path.extname(f),
        size_bytes: stat.size,
        mtime: stat.mtime.toISOString(),
      };
    });
    res.json({ track_count: fileList.length, total_bytes: totalBytes, files: fileList });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to read cache', message: err?.message });
  }
});

// 9. DELETE /api/cache
app.delete('/api/cache', (req: Request, res: Response) => {
  try {
    let deletedCount = 0;
    for (const f of fs.readdirSync(CACHE_DIR)) {
      if (AUDIO_EXTS.some((ext) => f.endsWith(ext)) || f.endsWith('.part')) {
        fs.unlinkSync(path.join(CACHE_DIR, f));
        deletedCount++;
      }
    }
    res.json({ deleted: deletedCount });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to clear cache', message: err?.message });
  }
});

// 10. Public HTTPS Share Link & Tunnel Manager (Zero-Auth, Zero-404 Link for Friends on Android)
let activePublicTunnelUrl: string | null = null;
let tunnelProcess: child_process.ChildProcess | null = null;

async function ensurePublicTunnel() {
  const cfBin = '/tmp/cloudflared';
  try {
    if (!fs.existsSync(cfBin)) {
      child_process.execSync(
        `curl -sL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o ${cfBin} && chmod +x ${cfBin}`,
        { timeout: 25000 }
      );
    }

    if (tunnelProcess) {
      return;
    }

    const proc = child_process.spawn(
      cfBin,
      ['tunnel', '--url', `http://127.0.0.1:${PORT}`, '--protocol', 'http2', '--no-autoupdate'],
      { stdio: ['ignore', 'pipe', 'pipe'] }
    );
    tunnelProcess = proc;

    const handleOutput = (chunk: Buffer) => {
      const text = chunk.toString();
      const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (match && match[0]) {
        activePublicTunnelUrl = match[0];
        console.log(`[b33t Public Android Link] Live at: ${activePublicTunnelUrl}/?mode=android`);
      }
    };

    proc.stdout?.on('data', handleOutput);
    proc.stderr?.on('data', handleOutput);

    proc.on('close', () => {
      tunnelProcess = null;
      setTimeout(() => {
        ensurePublicTunnel().catch(() => {});
      }, 3000);
    });
  } catch (e: any) {
    console.warn('[Public Tunnel Warning]:', e?.message);
  }
}

app.get(['/download/b33t-music.apk', '/b33t-music.apk'], (_req: Request, res: Response) => {
  const apkPath = path.resolve(process.cwd(), 'public', 'b33t-music.apk');
  if (!fs.existsSync(apkPath)) {
    try {
      child_process.execSync('node scripts/build-apk.cjs', { timeout: 25000 });
    } catch (e: any) {
      console.error('[APK Build on Demand Error]:', e?.message);
    }
  }

  if (fs.existsSync(apkPath)) {
    const stat = fs.statSync(apkPath);
    res.writeHead(200, {
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Disposition': 'attachment; filename="b33t-music.apk"',
      'Content-Length': String(stat.size),
      'Cache-Control': 'no-cache',
    });
    fs.createReadStream(apkPath).pipe(res);
  } else {
    res.status(404).send('APK file not found');
  }
});

app.get('/api/public_url', async (_req: Request, res: Response) => {
  if (!activePublicTunnelUrl) {
    ensurePublicTunnel().catch(() => {});
  }
  const apkPath = path.resolve(process.cwd(), 'public', 'b33t-music.apk');
  const apkSize = fs.existsSync(apkPath) ? fs.statSync(apkPath).size : 21018;

  // Detect Linux/Workstation local LAN IPv4 address for Capacitor / WiFi mobile connection
  let lanIp = '192.168.1.100';
  try {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        if (net.family === 'IPv4' && !net.internal) {
          lanIp = net.address;
          break;
        }
      }
    }
  } catch {}

  res.json({
    url: activePublicTunnelUrl,
    androidUrl: activePublicTunnelUrl ? `${activePublicTunnelUrl}/?mode=android` : null,
    apkDownloadUrl: activePublicTunnelUrl ? `${activePublicTunnelUrl}/download/b33t-music.apk` : '/download/b33t-music.apk',
    apkSizeBytes: apkSize,
    apkPackageName: 'com.b33t.music',
    apkVersion: '2.2.0',
    lanIp,
    lanServerUrl: `http://${lanIp}:${PORT}`,
  });
});

// -------------------------------------------------------------
// Vite Middleware / Static Client Delivery
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    // Serve a WebSocket-free /@vite/client module so Vite 8 CSS injection (updateStyle/removeStyle)
    // and module hot contexts work without throwing "Error: WebSocket closed without opened" on port 24678
    app.get('/@vite/client', (_req: Request, res: Response) => {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.send(`
const sheetsMap = new Map();
const linkSheetsMap = new Map();
if ("document" in globalThis) {
  document.querySelectorAll("style[data-vite-dev-id]").forEach((el) => {
    sheetsMap.set(el.getAttribute("data-vite-dev-id"), el);
  });
  document.querySelectorAll('link[rel="stylesheet"][data-vite-dev-id]').forEach((el) => {
    linkSheetsMap.set(el.getAttribute("data-vite-dev-id"), el);
  });
}
let lastInsertedStyle;
export function updateStyle(id, content) {
  if (linkSheetsMap.has(id)) return;
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement("style");
    style.setAttribute("type", "text/css");
    style.setAttribute("data-vite-dev-id", id);
    style.textContent = content;
    if (!lastInsertedStyle) {
      document.head.appendChild(style);
      setTimeout(() => { lastInsertedStyle = undefined; }, 0);
    } else {
      lastInsertedStyle.insertAdjacentElement("afterend", style);
    }
    lastInsertedStyle = style;
  } else if (style.textContent !== content) {
    style.textContent = content;
  }
  sheetsMap.set(id, style);
}
export function removeStyle(id) {
  if (linkSheetsMap.has(id)) {
    document.querySelectorAll(\`link[rel="stylesheet"][data-vite-dev-id="\${CSS.escape(id)}"]\`).forEach((el) => el.remove());
    linkSheetsMap.delete(id);
  }
  const style = sheetsMap.get(id);
  if (style) {
    document.head.removeChild(style);
    sheetsMap.delete(id);
  }
}
const dataMap = new Map();
export function createHotContext(ownerPath) {
  if (!dataMap.has(ownerPath)) dataMap.set(ownerPath, {});
  return {
    get data() { return dataMap.get(ownerPath); },
    accept() {},
    acceptExports() {},
    dispose() {},
    prune() {},
    decline() {},
    invalidate() {},
    on() {},
    off() {},
    send() {},
  };
}
export function injectQuery(url, queryToInject) {
  if (url[0] !== "." && url[0] !== "/") return url;
  const pathname = url.replace(/[?#].*$/, "");
  const { search, hash } = new URL(url, "http://vite.dev");
  return \`\${pathname}?\${queryToInject}\${search ? "&" + search.slice(1) : ""}\${hash || ""}\`;
}
const { HTMLElement = class {} } = globalThis;
export class ErrorOverlay extends HTMLElement {}
`);
    });

    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[b33t] Freedom to Music server running on http://0.0.0.0:${PORT}`);
    ensurePublicTunnel().catch(() => {});
  });
}

startServer();

