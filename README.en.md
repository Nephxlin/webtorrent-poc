# P2P Video Streaming - Complete Project

> 🇧🇷 [Portuguese Version](./README.md) | 🇺🇸 English Version

Complete P2P video streaming system with upload, HLS conversion, integrated player, and real-time CDN savings statistics.

## 🏗️ Project Structure

```
poc-webtorrent-2/
├── tracker/           # WebTorrent Tracker (peer discovery)
│   ├── src/
│   │   └── index.ts
│   ├── config.json
│   └── package.json
├── back-end/          # Backend in TypeScript/Node.js
│   ├── src/
│   │   ├── index.ts
│   │   ├── routes/
│   │   │   ├── upload.ts
│   │   │   ├── videos.ts
│   │   │   ├── serve.ts
│   │   │   └── conversion.ts
│   │   └── services/
│   │       ├── videoConverter.ts
│   │       ├── conversionTracker.ts
│   │       └── statsAggregator.ts
│   └── package.json
└── front-end/         # Frontend in Next.js/React
    ├── src/
    │   ├── app/
    │   │   ├── page.tsx
    │   │   ├── layout.tsx
    │   │   └── globals.css
    │   └── components/
    │       ├── P2PVideoPlayer.tsx
    │       ├── PeerNetworkGraph.tsx
    │       ├── VideoList.tsx
    │       ├── VideoUpload.tsx
    │       ├── ConversionStatus.tsx
    │       └── GlobalCDNSavings.tsx
    └── package.json
```

## 🚀 Quick Start

### Option 1: Docker (Recommended)

The easiest way to run the project is using Docker Compose:

```bash
docker-compose up -d
```

This will start all services (tracker, backend, and frontend). See [README-DOCKER.md](./README-DOCKER.md) for more details.

**Access:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Tracker WebSocket: ws://localhost:8000

### Option 2: Local Development

#### Prerequisites

- Node.js 20+
- FFmpeg installed on the system
- Yarn (recommended) or npm

#### Install FFmpeg

**Windows:**
```bash
choco install ffmpeg
```

**macOS:**
```bash
brew install ffmpeg
```

**Linux:**
```bash
sudo apt update && sudo apt install ffmpeg
```

#### 1. Install Dependencies

**Tracker:**
```bash
cd tracker
yarn install
```

**Backend:**
```bash
cd back-end
yarn install
```

**Frontend:**
```bash
cd front-end
yarn install
```

#### 2. Run the Tracker

```bash
cd tracker
yarn start
```

The tracker will be running at `ws://localhost:8000`

#### 3. Run the Backend

```bash
cd back-end
yarn dev
```

The backend will be running at `http://localhost:3001`

#### 4. Run the Frontend

```bash
cd front-end
yarn dev
```

The frontend will be running at `http://localhost:3000`

## 📋 Features

### Tracker (WebTorrent)
- ✅ P2P peer discovery server
- ✅ WebSocket for real-time communication
- ✅ Support for multiple simultaneous sessions

### Backend
- ✅ Video upload (MP4, MOV, AVI, WEBM, MKV)
- ✅ Automatic conversion to HLS (m3u8) using FFmpeg
- ✅ Conversion progress tracking
- ✅ List available videos
- ✅ Serve HLS files (manifests and segments)
- ✅ Delete videos
- ✅ WebSocket for globally aggregated P2P statistics
- ✅ Real-time CDN savings calculation

### Frontend
- ✅ Video upload with drag & drop
- ✅ Upload progress bar
- ✅ List of available videos with preview
- ✅ Integrated P2P player with HLS.js
- ✅ Support for external URLs (.m3u8)
- ✅ Detailed P2P download/upload statistics
  - Total download (HTTP + P2P)
  - Download via P2P
  - Download via HTTP
  - Total upload
  - Number of connected peers
- ✅ Real-time peer network visualization
- ✅ Video preload/buffering indicator
- ✅ Real-time conversion status
- ✅ Global CDN savings (aggregated from all sessions)

## 🔧 Configuration

### Environment Variables

**Tracker** (`tracker/config.json`):
```json
{
  "port": 8000,
  "host": "0.0.0.0"
}
```

**Backend** (`.env` or `docker-compose.yml`):
```env
PORT=3001
FRONTEND_URL=http://localhost:3000
NODE_ENV=production
```

**Frontend** (`.env.local` or `docker-compose.yml`):
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_TRACKER_URL=ws://localhost:8000
NODE_ENV=production
```

## 📡 API Endpoints

### Upload and Conversion

**POST /api/upload**
- Upload video and start HLS conversion
- **Format:** `multipart/form-data`
- **Field:** `video`
- **Response:** `{ videoId: string, message: string }`

### Video Management

**GET /api/videos**
- List all converted videos
- **Response:** Array of objects with `id`, `filename`, `createdAt`, etc.

**GET /api/videos/:id**
- Get information about a specific video
- **Response:** Object with video metadata

**DELETE /api/videos/:id**
- Delete a video and its associated files
- **Response:** `{ message: string }`

### Serve HLS Files

**GET /api/serve/:videoId/:filename**
- Serve HLS files (manifest .m3u8 and segment .ts files)
- Used by the player to load content

### Conversion Status

**GET /api/conversion/:videoId**
- Get the current conversion status of a video
- **Response:** `{ status: 'pending' | 'processing' | 'completed' | 'failed', progress?: number }`

### Health Check

**GET /api/health**
- Server health check
- **Response:** `{ status: 'ok' }`

### WebSocket (Socket.io)

**Connection:** `ws://localhost:3001`

**Events:**
- `stats-update`: Receives aggregated statistics from all P2P sessions
  ```typescript
  {
    totalDownloaded: number,
    totalUploaded: number,
    totalP2PDownloaded: number,
    totalHTTPDownloaded: number,
    activeSessions: number,
    totalPeers: number,
    cdnSavings: number // percentage
  }
  ```

## 🎬 How to Use

### 1. Upload Video

- Click "Select Video" or drag a file to the upload area
- Wait for the upload to complete (progress bar will be displayed)
- HLS conversion will start automatically
- Monitor progress in the conversion status section
- The video will appear in the list when conversion is complete

### 2. Play Video

- Click a video from the list on the right side of the player
- The player will start automatically
- The video will load via P2P when other peers are available
- Monitor download/upload statistics in real-time

### 3. Use External URL

- Paste a .m3u8 URL in the text field above the player
- Click "Load"
- The player will start playing the external URL
- Works with any compatible HLS stream

### 4. Monitor P2P Statistics

- **Local Metrics:** Displayed next to the player
  - Total download (HTTP + P2P)
  - Download via P2P
  - Download via HTTP
  - Total upload
  - Connected peers

- **Network Graph:** Visual representation of connected peers
  - Central node represents your client
  - Connected nodes represent other peers
  - Lines show active connections

- **Global CDN Savings:** Progress bar at the top
  - Aggregates data from all active sessions
  - Shows CDN savings percentage
  - Updates in real-time via WebSocket

## 🛠️ Technologies

### Tracker
- **Node.js 22** - JavaScript runtime
- **wt-tracker** - WebTorrent tracker for peer discovery
- **uWebSockets.js** - High-performance WebSocket server

### Backend
- **Node.js 20** - JavaScript runtime
- **TypeScript** - Static typing
- **Express** - Web framework
- **Multer** - File upload middleware
- **FFmpeg** - Video conversion to HLS
- **Socket.io** - WebSocket for real-time communication
- **CORS** - Cross-Origin Resource Sharing
- **UUID** - Unique ID generation

### Frontend
- **Next.js 15** - React framework
- **React 19** - UI library
- **TypeScript** - Static typing
- **Tailwind CSS 4** - Utility-first CSS framework
- **HLS.js** - HLS player for browsers
- **p2p-media-loader-hlsjs** - P2P integration for HLS.js
- **p2p-media-loader-core** - P2P system core
- **Socket.io Client** - WebSocket client

### Infrastructure
- **Docker** - Containerization
- **Docker Compose** - Container orchestration
- **WebTorrent** - WebRTC-based P2P protocol

## 🚀 Benefits and Advantages of the Technologies

### Why Use P2P for Video Streaming?

This project uses cutting-edge technologies to create an efficient and scalable P2P streaming solution. Here are the main benefits:

#### 💰 CDN Cost Savings

- **Up to 90% reduction in CDN costs**: When multiple users watch the same content, they share data with each other via P2P, drastically reducing server load
- **Automatic scalability**: The more users, the greater the P2P distribution capacity
- **Cost-effective**: Ideal for streaming platforms with high traffic

#### ⚡ wt-tracker Performance and Scalability

The [wt-tracker](https://github.com/Novage/wt-tracker) is a high-performance WebTorrent tracker that offers:

- **Up to 30,000 simultaneous peers** on a VPS with only:
  - 2 GiB of RAM
  - 1 virtual CPU
- **Advanced optimizations**:
  - I/O backend based on [uWebSockets.js](https://github.com/uNetworking/uWebSockets), one of the most efficient web servers available
  - Simultaneous support for `ws://` (HTTP) and `wss://` (HTTPS)
  - IPv4 and IPv6 support
  - Configurable compression to reduce bandwidth usage
- **Robustness and reliability**:
  - 100% TypeScript with static typing
  - Unit tests and CI/CD
  - Static code analysis
  - Real-time statistics via `/stats.json`

#### 🌐 P2P Media Loader

The [p2p-media-loader](https://github.com/Novage/p2p-media-loader) is an open-source engine that enables:

- **P2P streaming directly in the browser**: No plugins or extensions required
- **HLS and DASH support**: Compatible with major streaming formats
- **Automatic fallback**: If P2P is unavailable, continues via HTTP(S)
- **Smart distribution**: Random peers download new segments via HTTP and distribute via P2P
- **Zero client configuration**: Works automatically in the browser

#### 🔄 WebTorrent Protocol

[WebTorrent](https://webtorrent.io/) offers:

- **WebRTC-based P2P protocol**: Direct communication between browsers
- **No intermediate servers needed**: After initial connection, peers communicate directly
- **Native security**: WebRTC includes end-to-end encryption
- **Universal compatibility**: Works in all modern browsers

### 📊 Comparison: Traditional CDN vs P2P

| Aspect | Traditional CDN | P2P (This Project) |
|--------|------------------|---------------------|
| **Cost per user** | High (grows linearly) | Low (decreases with more users) |
| **Scalability** | Requires more servers | Scales automatically |
| **Latency** | Depends on CDN distance | Reduced (nearby peers) |
| **Infrastructure** | Expensive dedicated servers | Simple VPS (2GB RAM, 1 CPU) |
| **Capacity** | Limited by server | Increases with each new peer |

### 🎯 Ideal Use Cases

- **Streaming platforms** with popular content (many users watching the same video)
- **Live events** with large simultaneous audiences
- **Online education** with classes watched by many students
- **Companies** that need to reduce infrastructure costs
- **Startups** that want to scale without proportional cost increases

### 🔬 How Does wt-tracker Handle Thousands of Users?

1. **uWebSockets.js Backend**: 
   - High-performance C++ implementation
   - Efficient memory management
   - Optimized event loop for thousands of simultaneous connections

2. **Code Optimizations**:
   - Non-blocking asynchronous processing
   - Efficient data structures for peer management
   - WebSocket message compression

3. **Lightweight Architecture**:
   - Only WebRTC signaling (doesn't transmit video data)
   - Small and fast messages
   - Automatic cleanup of inactive connections

4. **Flexible Configuration**:
   - Configurable connection limits
   - Adjustable timeouts
   - Optional compression to reduce bandwidth

## 📝 Important Notes

### Storage
- **Original videos:** `back-end/uploads/` (temporary)
- **Converted videos:** `back-end/videos/{videoId}/` (HLS)
- **Conversion status:** `back-end/conversions/` (JSON)

### Performance
- Conversion may take time depending on video size and resolution
- System supports videos up to 2GB (configurable)
- P2P works better with multiple users watching the same video
- CDN savings increase proportionally with the number of peers

### P2P and CDN Savings
- Savings calculation: `(P2P Download / Total Download) * 100`
- Data is aggregated from all active sessions via WebSocket
- Savings are only significant when there are multiple peers sharing content

## 🐛 Troubleshooting

### FFmpeg not found
- **Docker:** FFmpeg is included in the image
- **Local:** Make sure FFmpeg is installed and in PATH
  ```bash
  ffmpeg -version  # Check installation
  ```

### CORS error
- Verify backend is running at `http://localhost:3001`
- Confirm `FRONTEND_URL` is correctly configured in backend
- Check if `NEXT_PUBLIC_API_URL` is correct in frontend

### Video doesn't convert
- Check backend logs: `docker-compose logs backend`
- Confirm video file is valid and in supported format
- Check available disk space

### Tracker doesn't connect
- Verify tracker is running: `docker-compose ps tracker`
- Confirm port 8000 is free
- Check logs: `docker-compose logs tracker`
- Confirm `NEXT_PUBLIC_TRACKER_URL` is correct in frontend

### WebSocket doesn't work
- Verify backend is running and healthy
- Confirm Socket.io is correctly configured
- Check backend logs for connection errors

### P2P doesn't work
- Make sure tracker is running
- Check if there are other peers watching the same video
- Confirm browser supports WebRTC
- Check browser console for errors

### Docker issues
- See [README-DOCKER.md](./README-DOCKER.md) for Docker-specific troubleshooting
- Full rebuild: `docker-compose down -v && docker-compose build --no-cache && docker-compose up -d`

## 📚 Additional Documentation

- [README-DOCKER.md](./README-DOCKER.md) - Complete Docker and Docker Compose guide

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the project
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License. See the `LICENSE` file for more details.

## 🙏 Acknowledgments

This project uses high-quality open-source technologies:

- **[HLS.js](https://github.com/video-dev/hls.js/)** - HLS player for browsers
- **[p2p-media-loader](https://github.com/Novage/p2p-media-loader)** - P2P engine for video streaming in the browser
- **[WebTorrent](https://webtorrent.io/)** - WebRTC-based P2P protocol for browsers
- **[wt-tracker](https://github.com/Novage/wt-tracker)** - High-performance WebTorrent tracker (up to 30k peers with 2GB RAM)
- **[uWebSockets.js](https://github.com/uNetworking/uWebSockets)** - High-performance WebSocket server used by wt-tracker
