# P2P Video Streaming - Projeto Completo

Sistema completo de streaming de vídeo P2P com upload, conversão para HLS e player integrado.

## 🏗️ Estrutura do Projeto

```
poc-webtorrent-2/
├── back-end/          # Backend em TypeScript/Node.js
│   ├── src/
│   │   ├── index.ts
│   │   ├── routes/
│   │   └── services/
│   └── package.json
└── front-end/         # Frontend em Next.js/React
    ├── src/
    │   ├── app/
    │   └── components/
    └── package.json
```

## 🚀 Início Rápido

### Pré-requisitos

- Node.js 18+
- FFmpeg instalado no sistema
- Yarn ou npm

### Instalar FFmpeg

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

### 1. Instalar Dependências

**Backend:**
```bash
cd back-end
npm install
# ou
yarn install
```

**Frontend:**
```bash
cd front-end
npm install
# ou
yarn install
```

### 2. Executar o Backend

```bash
cd back-end
npm run dev
# ou
yarn dev
```

O backend estará rodando em `http://localhost:3001`

### 3. Executar o Frontend

```bash
cd front-end
npm run dev
# ou
yarn dev
```

O frontend estará rodando em `http://localhost:3000`

## 📋 Funcionalidades

### Backend
- ✅ Upload de vídeos (MP4, MOV, AVI, WEBM, MKV)
- ✅ Conversão automática para HLS (m3u8)
- ✅ Listagem de vídeos
- ✅ Servir arquivos HLS
- ✅ Deletar vídeos

### Frontend
- ✅ Upload de vídeos com drag & drop
- ✅ Lista de vídeos disponíveis
- ✅ Player P2P integrado
- ✅ Suporte a URLs externas
- ✅ Estatísticas de download/upload P2P
- ✅ Visualização de rede de peers

## 🔧 Configuração

### Variáveis de Ambiente

**Backend** (`.env`):
```env
PORT=3001
```

**Frontend** (`.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## 📡 API Endpoints

### POST /api/upload
Upload de vídeo e conversão para HLS.

**Formato:** `multipart/form-data`
**Campo:** `video`

### GET /api/videos
Lista todos os vídeos convertidos.

### GET /api/videos/:id
Obtém informações de um vídeo específico.

### DELETE /api/videos/:id
Deleta um vídeo.

### GET /api/serve/:videoId/:filename
Serve arquivos HLS (m3u8 e segmentos .ts).

### GET /api/health
Health check do servidor.

## 🎬 Como Usar

1. **Fazer Upload:**
   - Clique em "Selecionar Vídeo" ou arraste um arquivo
   - Aguarde o upload e conversão (pode levar alguns minutos)

2. **Reproduzir Vídeo:**
   - Clique em um vídeo da lista
   - O player iniciará automaticamente

3. **URL Externa:**
   - Cole uma URL .m3u8 no campo de texto
   - Clique em "Carregar"

## 🛠️ Tecnologias

### Backend
- Node.js
- TypeScript
- Express
- Multer (upload)
- FFmpeg (conversão)
- CORS

### Frontend
- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- HLS.js
- p2p-media-loader

## 📝 Notas

- Os vídeos convertidos são armazenados em `back-end/videos/`
- Os vídeos originais são armazenados temporariamente em `back-end/uploads/`
- A conversão pode levar tempo dependendo do tamanho do vídeo
- O sistema suporta vídeos de até 2GB

## 🐛 Troubleshooting

### FFmpeg não encontrado
Certifique-se de que o FFmpeg está instalado e no PATH do sistema.

### Erro de CORS
Verifique se o backend está rodando e a URL está correta no frontend.

### Vídeo não converte
Verifique os logs do backend para mais detalhes sobre o erro.

## 📄 Licença

MIT
