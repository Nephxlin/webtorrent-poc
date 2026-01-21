# Backend - P2P Video Streaming

Backend em TypeScript e Node.js para upload e conversão de vídeos para formato HLS (m3u8).

## Requisitos

- Node.js 18+ 
- FFmpeg instalado no sistema

### Instalar FFmpeg

**Windows:**
```bash
# Usando Chocolatey
choco install ffmpeg

# Ou baixar de https://ffmpeg.org/download.html
```

**macOS:**
```bash
brew install ffmpeg
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install ffmpeg
```

## Instalação

```bash
cd back-end
npm install
# ou
yarn install
```

## Executar

### Modo Desenvolvimento
```bash
npm run dev
# ou
yarn dev
```

### Modo Produção
```bash
npm run build
npm start
# ou
yarn build
yarn start
```

O servidor estará rodando em `http://localhost:3001`

## Endpoints

### POST /api/upload
Upload de vídeo e conversão automática para HLS.

**Formato:** `multipart/form-data`
**Campo:** `video` (arquivo de vídeo)

**Resposta:**
```json
{
  "success": true,
  "message": "Vídeo enviado e convertido com sucesso",
  "video": {
    "id": "video-uuid",
    "originalName": "meu-video.mp4",
    "fileName": "meu-video-uuid.mp4",
    "m3u8Url": "/api/serve/video-uuid/playlist.m3u8",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### GET /api/videos
Lista todos os vídeos convertidos.

**Resposta:**
```json
{
  "videos": [
    {
      "id": "video-uuid",
      "originalName": "meu-video.mp4",
      "fileName": "meu-video-uuid.mp4",
      "m3u8Url": "/api/serve/video-uuid/playlist.m3u8",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "size": 12345
    }
  ]
}
```

### GET /api/videos/:id
Obtém informações de um vídeo específico.

### DELETE /api/videos/:id
Deleta um vídeo e todos os seus arquivos.

### GET /api/serve/:videoId/:filename
Serve arquivos HLS (m3u8 e segmentos .ts).

### GET /api/health
Health check do servidor.

## Estrutura de Diretórios

```
back-end/
├── src/
│   ├── index.ts              # Servidor principal
│   ├── routes/
│   │   ├── upload.ts         # Rotas de upload
│   │   ├── videos.ts         # Rotas de listagem
│   │   └── serve.ts          # Rotas para servir arquivos
│   └── services/
│       └── videoConverter.ts # Serviço de conversão
├── uploads/                  # Vídeos originais (temporários)
├── videos/                   # Vídeos convertidos para HLS
│   └── [video-id]/
│       ├── playlist.m3u8
│       ├── segment_000.ts
│       ├── segment_001.ts
│       └── metadata.json
└── dist/                     # Código compilado
```

## Variáveis de Ambiente

Crie um arquivo `.env` (opcional):

```env
PORT=3001
```
