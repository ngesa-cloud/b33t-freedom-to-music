# 🎵 b33t — Freedom to Music (v2.6)

<p align="center">
  <img src="./public/logo.png" width="120" height="120" alt="b33t logo" style="border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.6);" />
</p>

<p align="center">
  <strong>Ultra-Fast, Spotify-Grade Music Streaming for Laptop & Workstation.</strong><br>
  <em>Zero Subscriptions. Zero Ads. Zero Telemetry. 100% Freedom.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-v20+-brightgreen?style=flat-square&logo=node.js" alt="Node" />
  <img src="https://img.shields.io/badge/React-19.0-blue?style=flat-square&logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-7.0-3178C6?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/TailwindCSS-v4.0-38B2AC?style=flat-square&logo=tailwind-css" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Engine-yt--dlp%20(Opus%20251)-red?style=flat-square" alt="yt-dlp" />
  <img src="https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square" alt="License" />
</p>

---

## ✊ The Manifesto: Freedom to Music

Commercial streaming monopolies have turned music into a walled garden of monthly paywalls, intrusive audio ads, algorithmic lock-in, and continuous behavioral profiling.

**b33t** breaks that mold:
* **$0.00 / Forever Free**: Unlimited music catalog without credit cards, tiers, or recurring billing.
* **0% Audio Ads**: Uninterrupted listening from first second to last.
* **Zero Telemetry**: Runs privately on `127.0.0.1`. What you listen to remains strictly your business.
* **Native Opus 251 Audio**: Streams high-fidelity uncompressed Opus audio with HTTP Range seeking (`206 Partial Content`).
* **Offline Audio Cache**: Saves full tracks directly into `audio_cache/*.opus`.

---

## ✨ Features (v2.6)

* **💀 Sound Reactor Hero**: Interactive cyberpunk skull wearing studio DJ headphones that bobs to the rhythm and pulses with real-time 8-band Web Audio FFT analysis.
* **🌍 Universal Artist Discographies**: Deep dive into full albums and 10–15 top tracks for African and global music legends (Bien, Sauti Sol, Burna Boy, Ayra Starr, Asake, Tems, Drake, Kendrick Lamar, The Weeknd, Travis Scott).
* **🎛️ 5-Band Parametric Equalizer**: Peaking biquad filters (60Hz, 250Hz, 1kHz, 4kHz, 12kHz) with custom presets (*Bass Boost Opus 251*, *Afrobeats Warmth*, *Vocal Clarity*, *Club*).
* **🌊 4-Mode Web Audio Visualizer**: 48-band spectrum bars with decaying peak caps, oscilloscope waveforms, circular bass pulse, and dual stereo VU meters.
* **🎤 Synchronized Karaoke Lyrics**: Real-time lyrics scrolling automatically with playback progress and click-to-seek support.
* **⚡ Dual Playback Pipeline**: Web Audio API engine paired with a client-side IFrame engine guaranteeing full song playback with zero 30-second previews.
* **🔍 Transparent REST API Explorer**: Built-in developer diagnostic console measuring real HTTP latency and JSON payloads for all endpoints.
* **⌨️ Desktop Hotkeys**: Full keyboard navigation (`Space` play/pause, `Arrows` seek/volume, `M` mute, `L` lyrics, `V` visualizer, `E` EQ, `Q` queue, `S` search).

---

## 🚀 Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/ngesa-cloud/b33t-freedom-to-music.git
cd b33t-freedom-to-music
```

### 2. Install dependencies
```bash
npm install --legacy-peer-deps
```

### 3. Start development server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser!

### 4. Build for production
```bash
npm run build
npm start
```

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────┐
│           b33t Client (React 19 + TypeScript + Vite)   │
│   • Sound Reactor (Web Audio FFT)                      │
│   • 5-Band Parametric EQ (BiquadFilterNode)            │
│   • Synchronized Lyrics & Queue Drawer                 │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP / Range Requests
                           ▼
┌────────────────────────────────────────────────────────┐
│          Unified Express Server (:3000 / server.ts)    │
│   • /api/search?q=query       • /api/stream/:video_id  │
│   • /api/artist/:name/tracks  • /api/album/:id/tracks  │
│   • /api/cache (GET/DELETE)   • /api/resolve_track     │
│   • yt-dlp Extraction Engine  • audio_cache/*.opus     │
└────────────────────────────────────────────────────────┘
```

---

## 👤 Author & Credits

Crafted with passion by **Dominic Nyongesa** ([@ngesa-cloud](https://github.com/ngesa-cloud)).  
*Licensed under the [MIT License](LICENSE).*
