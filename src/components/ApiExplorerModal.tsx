import React, { useState } from 'react';
import { X, Server, Play, Copy, Check, Terminal, Cpu, Loader2 } from 'lucide-react';
import { apiUrl } from '../context/MusicPlayerContext';

interface ApiExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface EndpointDef {
  method: 'GET' | 'DELETE';
  path: string;
  urlTemplate: string;
  desc: string;
  defaultParam?: string;
}

export const ApiExplorerModal: React.FC<ApiExplorerModalProps> = ({ isOpen, onClose }) => {
  const [selectedEndpointIndex, setSelectedEndpointIndex] = useState<number>(0);
  const [paramInput, setParamInput] = useState<string>('Bien Inauma');
  const [responseJson, setResponseJson] = useState<string>('');
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const endpoints: EndpointDef[] = [
    {
      method: 'GET',
      path: '/api/ping',
      urlTemplate: '/api/ping',
      desc: 'Health status, server hostname, and timestamp',
    },
    {
      method: 'GET',
      path: '/api/version',
      urlTemplate: '/api/version',
      desc: 'Engine version, yt-dlp release, and cache directory',
    },
    {
      method: 'GET',
      path: '/api/search?q=<query>',
      urlTemplate: '/api/search?q={param}',
      desc: 'Live query search for songs and official videos',
      defaultParam: 'Bien Inauma',
    },
    {
      method: 'GET',
      path: '/api/featured_artists',
      urlTemplate: '/api/featured_artists',
      desc: 'Curated African and global artist discographies catalog',
    },
    {
      method: 'GET',
      path: '/api/artist/<name>/tracks',
      urlTemplate: '/api/artist/{param}/tracks',
      desc: 'Top discography tracks + albums for specified artist',
      defaultParam: 'Bien',
    },
    {
      method: 'GET',
      path: '/api/status/<video_id>',
      urlTemplate: '/api/status/{param}',
      desc: 'Query download and disk cache state for a video ID',
      defaultParam: 'Or2sMfOcTtw',
    },
    {
      method: 'GET',
      path: '/api/cache',
      urlTemplate: '/api/cache',
      desc: 'Total cached tracks count, total bytes, and file breakdown',
    },
    {
      method: 'DELETE',
      path: '/api/cache',
      urlTemplate: '/api/cache',
      desc: 'Flush audio_cache/ and delete all cached .opus files',
    },
  ];

  if (!isOpen) return null;

  const currentDef = endpoints[selectedEndpointIndex];

  const handleExecute = async () => {
    setIsLoading(true);
    setResponseJson('');
    setStatusCode(null);
    setLatencyMs(null);

    const resolvedUrl = apiUrl(currentDef.urlTemplate.replace('{param}', encodeURIComponent(paramInput)));

    const t0 = performance.now();
    try {
      const res = await fetch(resolvedUrl, {
        method: currentDef.method,
      });
      const t1 = performance.now();
      setLatencyMs(Math.round((t1 - t0) * 10) / 10);
      setStatusCode(res.status);

      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await res.json();
        setResponseJson(JSON.stringify(data, null, 2));
      } else {
        const text = await res.text();
        setResponseJson(text);
      }
    } catch (err: any) {
      const t1 = performance.now();
      setLatencyMs(Math.round((t1 - t0) * 10) / 10);
      setStatusCode(500);
      setResponseJson(JSON.stringify({ error: 'Fetch failed', message: err?.message }, null, 2));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(responseJson);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200">
      <div className="bg-[#121216] border border-[#1e1e24] rounded-2xl w-full max-w-4xl max-h-[88vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#1e1e24] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-[#1DB954] flex items-center justify-center">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Live REST API Explorer</h2>
              <p className="text-xs text-[#8a8a92]">
                Interactive testing for native Express / yt-dlp backend
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#8a8a92] hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Architecture Diagram SVG */}
          <div className="p-4 rounded-xl bg-[#0a0a0c] border border-[#1e1e24] space-y-3">
            <div className="flex items-center gap-2 text-zinc-300 font-semibold text-xs">
              <Cpu className="w-3.5 h-3.5 text-[#1DB954]" />
              <span>System Architecture Diagram</span>
            </div>
            <div className="w-full flex items-center justify-center py-2">
              <svg viewBox="0 0 760 80" className="w-full max-w-3xl h-auto text-xs font-mono">
                {/* Node 1: Desktop Browser */}
                <rect x="10" y="15" width="150" height="50" rx="8" fill="#1a1a20" stroke="#1e1e24" strokeWidth="1.5" />
                <text x="85" y="38" fill="#ffffff" textAnchor="middle" fontWeight="bold">Desktop Browser</text>
                <text x="85" y="52" fill="#8a8a92" textAnchor="middle" fontSize="10">Web Audio API / UI</text>

                {/* Arrow 1 */}
                <line x1="160" y1="40" x2="200" y2="40" stroke="#1DB954" strokeWidth="2" strokeDasharray="4 2" />
                <polygon points="200,40 194,36 194,44" fill="#1DB954" />

                {/* Node 2: Express Server */}
                <rect x="205" y="15" width="160" height="50" rx="8" fill="#064e3b" stroke="#10b981" strokeWidth="1.5" />
                <text x="285" y="38" fill="#a7f3d0" textAnchor="middle" fontWeight="bold">b33t Server (:3000)</text>
                <text x="285" y="52" fill="#34d399" textAnchor="middle" fontSize="10">HTTP Range Proxy</text>

                {/* Arrow 2 */}
                <line x1="365" y1="40" x2="405" y2="40" stroke="#1DB954" strokeWidth="2" strokeDasharray="4 2" />
                <polygon points="405,40 399,36 399,44" fill="#1DB954" />

                {/* Node 3: yt-dlp & Extractor */}
                <rect x="410" y="15" width="150" height="50" rx="8" fill="#1a1a20" stroke="#1e1e24" strokeWidth="1.5" />
                <text x="485" y="38" fill="#ffffff" textAnchor="middle" fontWeight="bold">yt-dlp Extractor</text>
                <text x="485" y="52" fill="#8a8a92" textAnchor="middle" fontSize="10">Format 251 Opus</text>

                {/* Arrow 3 */}
                <line x1="560" y1="40" x2="600" y2="40" stroke="#1DB954" strokeWidth="2" strokeDasharray="4 2" />
                <polygon points="600,40 594,36 594,44" fill="#1DB954" />

                {/* Node 4: audio_cache */}
                <rect x="605" y="15" width="145" height="50" rx="8" fill="#1a1a20" stroke="#1e1e24" strokeWidth="1.5" />
                <text x="677" y="38" fill="#00e0a0" textAnchor="middle" fontWeight="bold">audio_cache/</text>
                <text x="677" y="52" fill="#8a8a92" textAnchor="middle" fontSize="10">Local Disk Replay</text>
              </svg>
            </div>
          </div>

          {/* Endpoint Selector & Runner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Endpoints List */}
            <div className="space-y-1.5 border-r border-[#1e1e24] pr-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#8a8a92] mb-2 block">
                Select Endpoint
              </span>
              {endpoints.map((ep, idx) => (
                <button
                  key={ep.path}
                  onClick={() => {
                    setSelectedEndpointIndex(idx);
                    setParamInput(ep.defaultParam || '');
                    setResponseJson('');
                    setStatusCode(null);
                    setLatencyMs(null);
                  }}
                  className={`w-full text-left p-2.5 rounded-lg transition-all ${
                    selectedEndpointIndex === idx
                      ? 'bg-[#1a1a20] text-white border border-[#1DB954]'
                      : 'bg-[#121216] text-[#8a8a92] hover:text-white hover:bg-[#1a1a20] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        ep.method === 'DELETE'
                          ? 'bg-red-950 text-red-400 border border-red-500/30'
                          : 'bg-emerald-950 text-[#1DB954] border border-emerald-500/30'
                      }`}
                    >
                      {ep.method}
                    </span>
                    <span className="font-mono text-xs text-white truncate">{ep.path}</span>
                  </div>
                  <p className="text-[10px] text-[#8a8a92] mt-1 truncate">{ep.desc}</p>
                </button>
              ))}
            </div>

            {/* Test Input & Response */}
            <div className="md:col-span-2 space-y-4">
              {/* Request Bar */}
              <div className="p-3 rounded-xl bg-[#1a1a20] border border-[#1e1e24] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-semibold text-white">{currentDef.path}</span>
                  <button
                    onClick={handleExecute}
                    disabled={isLoading}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#1DB954] text-black font-bold hover:bg-[#00e0a0] transition-colors shadow disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-black" />
                    )}
                    <span>{isLoading ? 'Executing...' : 'Send Live Request'}</span>
                  </button>
                </div>

                {currentDef.defaultParam !== undefined && (
                  <div className="mt-2">
                    <label className="text-[11px] text-[#8a8a92] block mb-1">
                      Parameter Value:
                    </label>
                    <input
                      type="text"
                      value={paramInput}
                      onChange={(e) => setParamInput(e.target.value)}
                      placeholder={currentDef.defaultParam}
                      className="w-full bg-[#0a0a0c] border border-[#1e1e24] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#1DB954] font-mono"
                    />
                  </div>
                )}
              </div>

              {/* Response Panel */}
              <div className="rounded-xl bg-[#0a0a0c] border border-[#1e1e24] overflow-hidden">
                <div className="p-2.5 bg-[#121216] border-b border-[#1e1e24] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-3.5 h-3.5 text-[#8a8a92]" />
                    <span className="font-semibold text-zinc-300">Live Server Response</span>
                    {statusCode !== null && (
                      <span
                        className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                          statusCode === 200 || statusCode === 206
                            ? 'bg-emerald-950 text-[#1DB954] border border-emerald-500/30'
                            : 'bg-red-950 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {statusCode} {statusCode === 200 ? 'OK' : statusCode === 206 ? 'Partial Content' : ''}
                      </span>
                    )}
                    {latencyMs !== null && (
                      <span className="font-mono text-[10px] text-[#8a8a92] tabular-nums">
                        {latencyMs}ms latency
                      </span>
                    )}
                  </div>
                  {responseJson && (
                    <button
                      onClick={handleCopy}
                      className="text-[#8a8a92] hover:text-white flex items-center gap-1 text-[11px] transition-colors"
                    >
                      {isCopied ? <Check className="w-3 h-3 text-[#1DB954]" /> : <Copy className="w-3 h-3 text-[#8a8a92]" />}
                      <span>{isCopied ? 'Copied' : 'Copy'}</span>
                    </button>
                  )}
                </div>

                <div className="p-4 max-h-56 overflow-y-auto font-mono text-[11px] text-[#00e0a0] leading-relaxed">
                  {responseJson ? (
                    <pre>{responseJson}</pre>
                  ) : (
                    <p className="text-[#8a8a92] italic">
                      Click &quot;Send Live Request&quot; to test this live Express endpoint.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#121216] border-t border-[#1e1e24] flex items-center justify-between text-xs text-[#8a8a92]">
          <span className="font-mono text-[11px]">Sub-second response engine</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
