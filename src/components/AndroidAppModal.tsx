import React, { useState, useEffect } from 'react';
import {
  X,
  Smartphone,
  Download,
  Copy,
  Check,
  Share2,
  QrCode,
  ExternalLink,
  ShieldCheck,
  PackageCheck,
  Wifi,
} from 'lucide-react';
import { usePublicShareUrl } from '../hooks/usePWAInstall';
import { getApiHost, setApiHost, apiUrl } from '../utils/apiBase';

interface AndroidAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAndroidViewMode: boolean;
  onToggleAndroidViewMode: () => void;
}

export const AndroidAppModal: React.FC<AndroidAppModalProps> = ({
  isOpen,
  onClose,
  isAndroidViewMode,
  onToggleAndroidViewMode,
}) => {
  const { apkDownloadUrl, isTunnelReady } = usePublicShareUrl();
  const [copied, setCopied] = useState(false);
  const [serverBaseInput, setServerBaseInput] = useState(() => getApiHost());
  const [detectedLanUrl, setDetectedLanUrl] = useState<string>('');
  const [savedServerBase, setSavedServerBase] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setServerBaseInput(getApiHost());
    fetch(apiUrl('/api/public_url'))
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.lanServerUrl) setDetectedLanUrl(d.lanServerUrl);
      })
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveServerBase = () => {
    setApiHost(serverBaseInput);
    setSavedServerBase(true);
    setTimeout(() => setSavedServerBase(false), 2000);
  };

  const shareText = `Download the b33t Music Android APK (v2.2.0)! Tap the link to download and install the native .apk on your phone (no GitHub or Termux needed):`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(apkDownloadUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const input = document.createElement('input');
      input.value = apkDownloadUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'b33t Music — Android APK Download',
          text: shareText,
          url: apkDownloadUrl,
        });
      } catch {
        // User cancelled native share sheet
      }
    } else {
      handleCopyLink();
    }
  };

  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(`${shareText} ${apkDownloadUrl}`)}`;
  const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(apkDownloadUrl)}&text=${encodeURIComponent(shareText)}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&bgcolor=121212&color=1ed760&margin=10&data=${encodeURIComponent(apkDownloadUrl)}`;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#121212] border border-[#282828] rounded-2xl shadow-2xl overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Banner */}
        <div className="bg-gradient-to-r from-[#0f381e] via-[#15291c] to-[#121212] p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#1ed760] flex items-center justify-center shadow-lg shadow-[#1ed760]/20 shrink-0">
              <Smartphone className="w-6 h-6 text-black stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-white tracking-tight">
                  b33t Music — Native Android APK
                </h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#1ed760]/20 text-[#1ed760] flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  v1+v2+v3 Signed APK
                </span>
              </div>
              <p className="text-xs text-[#b3b3b3] mt-0.5">
                Package: <code className="text-zinc-300 font-mono">com.ngesa.b33t</code> • Real standalone Android APK (not a browser shortcut)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/40 text-[#b3b3b3] hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Primary Direct APK Download CTA */}
          <div className="bg-gradient-to-r from-[#1ed760]/15 via-[#181818] to-[#181818] border border-[#1ed760]/30 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <PackageCheck className="w-5 h-5 text-[#1ed760]" />
                <span className="text-base font-extrabold text-white">
                  b33t-music.apk (v2.2.0 Release)
                </span>
              </div>
              <p className="text-xs text-[#b3b3b3]">
                Compiled with Android SDK Build-Tools 34 • Runs natively on Android 6.0 – 15+ without any browser bar or server dependency.
              </p>
            </div>

            <a
              href="/download/b33t-music.apk"
              download="b33t-music.apk"
              className="px-6 py-3 rounded-full bg-[#1ed760] hover:bg-[#3be477] text-black font-extrabold text-sm flex items-center gap-2 shadow-xl shadow-[#1ed760]/20 transition-transform active:scale-95 shrink-0"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>Download APK</span>
            </a>
          </div>

          {/* Configurable API Base URL (WiFi / LAN Server Settings) */}
          <div className="bg-[#181818] border border-white/5 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-[#1ed760]" />
                <label htmlFor="modal-lan-host-input" className="text-xs font-bold uppercase tracking-wider text-white">
                  Server IP (LAN)
                </label>
              </div>
              {detectedLanUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setServerBaseInput(detectedLanUrl);
                    setApiHost(detectedLanUrl);
                    setSavedServerBase(true);
                    setTimeout(() => setSavedServerBase(false), 2000);
                  }}
                  className="text-[11px] text-[#1ed760] hover:underline font-mono cursor-pointer"
                >
                  Use detected LAN: {detectedLanUrl}
                </button>
              )}
            </div>
            <p className="text-[11px] text-[#b3b3b3]">
              Point the Capacitor Android app at your laptop&apos;s LAN IP (default <code className="text-zinc-200">http://192.168.1.100:3000</code>) when switching WiFi networks—no APK rebuild needed.
            </p>
            <div className="flex items-center gap-2">
              <input
                id="modal-lan-host-input"
                type="text"
                aria-label="Server IP (LAN)"
                value={serverBaseInput}
                onChange={(e) => setServerBaseInput(e.target.value)}
                placeholder="http://192.168.1.100:3000"
                className="flex-1 bg-[#0a0a0a] border border-white/10 rounded-lg px-3.5 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-[#1ed760]"
              />
              <button
                type="button"
                onClick={handleSaveServerBase}
                className="px-4 py-2 rounded-lg bg-[#282828] hover:bg-[#333333] text-white font-bold text-xs transition-colors cursor-pointer shrink-0"
              >
                {savedServerBase ? 'Saved!' : 'Save API Host'}
              </button>
            </div>
          </div>

          {/* 1. Share Direct APK Download Link with Friends */}
          <div className="bg-[#181818] border border-white/5 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#b3b3b3]">
                Share Direct APK Download Link with Friends
              </span>
              <span className="text-[11px] text-[#1ed760] font-semibold">
                {isTunnelReady ? 'Direct APK Download Link Ready' : 'Preparing Public Link...'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={apkDownloadUrl}
                className="flex-1 bg-[#0a0a0a] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs font-mono text-zinc-200 focus:outline-none select-all"
              />
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#1ed760] hover:bg-[#3be477] text-black font-bold text-xs transition-colors shrink-0 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy APK Link</span>
                  </>
                )}
              </button>
            </div>

            {/* Social Share Buttons */}
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <a
                href={whatsappShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] border border-[#25D366]/30 text-xs font-bold transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Send on WhatsApp</span>
              </a>

              <a
                href={telegramShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-[#2AABEE]/15 hover:bg-[#2AABEE]/25 text-[#2AABEE] border border-[#2AABEE]/30 text-xs font-bold transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Send on Telegram</span>
              </a>

              <button
                onClick={handleNativeShare}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-[#282828] hover:bg-[#333333] text-white text-xs font-bold transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share APK Link</span>
              </button>
            </div>
          </div>

          {/* 2. Two-Column Section: Scan QR to Download APK + Installation Guide */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: Scan QR Code with Phone Camera */}
            <div className="bg-[#181818] border border-white/5 rounded-xl p-4 flex flex-col items-center justify-center text-center space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                <QrCode className="w-4 h-4 text-[#1ed760]" />
                <span>Scan with Android Camera to Download .APK</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#121212] border border-white/10 shadow-inner">
                <img
                  src={qrImageUrl}
                  alt="Scan QR code to download b33t-music.apk"
                  className="w-36 h-36 rounded-lg"
                />
              </div>
              <p className="text-[11px] text-[#b3b3b3] max-w-[230px]">
                Scanning this QR code immediately downloads <strong className="text-white">b33t-music.apk</strong> onto your phone.
              </p>
            </div>

            {/* Right: How to Install APK on Android */}
            <div className="bg-[#181818] border border-white/5 rounded-xl p-4 flex flex-col justify-between space-y-3">
              <div className="space-y-2.5">
                <h3 className="text-sm font-bold text-white">
                  How to Install the APK on Android:
                </h3>
                <div className="space-y-2 text-xs text-[#b3b3b3]">
                  <div className="p-2.5 rounded-lg bg-[#121212] border border-white/5">
                    <span className="text-[#1ed760] font-bold">1. Download:</span> Tap <strong>Download APK</strong> above, or send the <code className="text-white">b33t-music.apk</code> file / link to friends on WhatsApp.
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#121212] border border-white/5">
                    <span className="text-[#1ed760] font-bold">2. Open APK:</span> Tap <code className="text-white">b33t-music.apk</code> in your Android Downloads notification.
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#121212] border border-white/5">
                    <span className="text-[#1ed760] font-bold">3. Tap Install:</span> Allow installation if prompted (if Google Play Protect asks &ldquo;App not recognized&rdquo;, tap <strong>More details &rarr; Install anyway</strong> since it is self-signed).
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  onToggleAndroidViewMode();
                  onClose();
                }}
                className="w-full py-2.5 px-4 rounded-full border border-white/15 hover:border-white text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Smartphone className="w-4 h-4 text-[#1ed760]" />
                <span>
                  {isAndroidViewMode ? 'Switch to Desktop Layout' : 'Preview Android App UI'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
