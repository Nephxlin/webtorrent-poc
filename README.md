# P2P Video Streaming - Projeto Completo

> 🇺🇸 [English Version](./README.en.md) | 🇧🇷 Versão em Português

Sistema completo de streaming de vídeo P2P com upload, conversão para HLS, player integrado e estatísticas de economia de CDN em tempo real.

## 🏗️ Estrutura do Projeto

```
poc-webtorrent-2/
├── tracker/           # WebTorrent Tracker (descoberta de peers)
│   ├── src/
│   │   └── index.ts
│   ├── config.json
│   └── package.json
├── back-end/          # Backend em TypeScript/Node.js
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
└── front-end/         # Frontend em Next.js/React
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

## 🚀 Início Rápido

### Opção 1: Docker (Recomendado)

A forma mais fácil de executar o projeto é usando Docker Compose:

```bash
docker-compose up -d
```

Isso iniciará todos os serviços (tracker, backend e frontend). Veja [README-DOCKER.md](./README-DOCKER.md) para mais detalhes.

**Acessos:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Tracker WebSocket: ws://localhost:8000

### Opção 2: Desenvolvimento Local

#### Pré-requisitos

- Node.js 20+
- FFmpeg instalado no sistema
- Yarn (recomendado) ou npm

#### Instalar FFmpeg

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

#### 1. Instalar Dependências

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

#### 2. Executar o Tracker

```bash
cd tracker
yarn start
```

O tracker estará rodando em `ws://localhost:8000`

#### 3. Executar o Backend

```bash
cd back-end
yarn dev
```

O backend estará rodando em `http://localhost:3001`

#### 4. Executar o Frontend

```bash
cd front-end
yarn dev
```

O frontend estará rodando em `http://localhost:3000`

## 📋 Funcionalidades

### Tracker (WebTorrent)
- ✅ Servidor de descoberta de peers P2P
- ✅ WebSocket para comunicação em tempo real
- ✅ Suporte a múltiplas sessões simultâneas

### Backend
- ✅ Upload de vídeos (MP4, MOV, AVI, WEBM, MKV)
- ✅ Conversão automática para HLS (m3u8) usando FFmpeg
- ✅ Rastreamento de progresso de conversão
- ✅ Listagem de vídeos disponíveis
- ✅ Servir arquivos HLS (manifestos e segmentos)
- ✅ Deletar vídeos
- ✅ WebSocket para estatísticas P2P agregadas globalmente
- ✅ Cálculo de economia de CDN em tempo real

### Frontend
- ✅ Upload de vídeos com drag & drop
- ✅ Barra de progresso de upload
- ✅ Lista de vídeos disponíveis com preview
- ✅ Player P2P integrado com HLS.js
- ✅ Suporte a URLs externas (.m3u8)
- ✅ Estatísticas detalhadas de download/upload P2P
  - Download total (HTTP + P2P)
  - Download via P2P
  - Download via HTTP
  - Upload total
  - Número de peers conectados
- ✅ Visualização de rede de peers em tempo real
- ✅ Indicador de preload/buffering do vídeo
- ✅ Status de conversão em tempo real
- ✅ Economia global de CDN (agregada de todas as sessões)

## 🔧 Configuração

### Variáveis de Ambiente

**Tracker** (`tracker/config.json`):
```json
{
  "port": 8000,
  "host": "0.0.0.0"
}
```

**Backend** (`.env` ou `docker-compose.yml`):
```env
PORT=3001
FRONTEND_URL=http://localhost:3000
NODE_ENV=production
```

**Frontend** (`.env.local` ou `docker-compose.yml`):
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_TRACKER_URL=ws://localhost:8000
NODE_ENV=production
```

## 📡 API Endpoints

### Upload e Conversão

**POST /api/upload**
- Upload de vídeo e início da conversão para HLS
- **Formato:** `multipart/form-data`
- **Campo:** `video`
- **Resposta:** `{ videoId: string, message: string }`

### Gerenciamento de Vídeos

**GET /api/videos**
- Lista todos os vídeos convertidos
- **Resposta:** Array de objetos com `id`, `filename`, `createdAt`, etc.

**GET /api/videos/:id**
- Obtém informações de um vídeo específico
- **Resposta:** Objeto com metadados do vídeo

**DELETE /api/videos/:id**
- Deleta um vídeo e seus arquivos associados
- **Resposta:** `{ message: string }`

### Servir Arquivos HLS

**GET /api/serve/:videoId/:filename**
- Serve arquivos HLS (manifestos .m3u8 e segmentos .ts)
- Usado pelo player para carregar o conteúdo

### Status de Conversão

**GET /api/conversion/:videoId**
- Obtém o status atual da conversão de um vídeo
- **Resposta:** `{ status: 'pending' | 'processing' | 'completed' | 'failed', progress?: number }`

### Health Check

**GET /api/health**
- Health check do servidor
- **Resposta:** `{ status: 'ok' }`

### WebSocket (Socket.io)

**Conexão:** `ws://localhost:3001`

**Eventos:**
- `stats-update`: Recebe estatísticas agregadas de todas as sessões P2P
  ```typescript
  {
    totalDownloaded: number,
    totalUploaded: number,
    totalP2PDownloaded: number,
    totalHTTPDownloaded: number,
    activeSessions: number,
    totalPeers: number,
    cdnSavings: number // porcentagem
  }
  ```

## 🎬 Como Usar

### 1. Fazer Upload de Vídeo

- Clique em "Selecionar Vídeo" ou arraste um arquivo na área de upload
- Aguarde o upload completar (barra de progresso será exibida)
- A conversão para HLS iniciará automaticamente
- Monitore o progresso na seção de status de conversão
- O vídeo aparecerá na lista quando a conversão estiver completa

### 2. Reproduzir Vídeo

- Clique em um vídeo da lista à direita do player
- O player iniciará automaticamente
- O vídeo será carregado via P2P quando outros peers estiverem disponíveis
- Monitore as estatísticas de download/upload em tempo real

### 3. Usar URL Externa

- Cole uma URL .m3u8 no campo de texto acima do player
- Clique em "Carregar"
- O player iniciará a reprodução da URL externa
- Funciona com qualquer stream HLS compatível

### 4. Monitorar Estatísticas P2P

- **Métricas Locais:** Exibidas ao lado do player
  - Download total (HTTP + P2P)
  - Download via P2P
  - Download via HTTP
  - Upload total
  - Peers conectados

- **Gráfico de Rede:** Visualização visual dos peers conectados
  - Nó central representa seu cliente
  - Nós conectados representam outros peers
  - Linhas mostram conexões ativas

- **Economia Global de CDN:** Barra de progresso no topo
  - Agrega dados de todas as sessões ativas
  - Mostra porcentagem de economia de CDN
  - Atualiza em tempo real via WebSocket

## 🛠️ Tecnologias

### Tracker
- **Node.js 22** - Runtime JavaScript
- **wt-tracker** - WebTorrent tracker para descoberta de peers
- **uWebSockets.js** - Servidor WebSocket de alta performance

### Backend
- **Node.js 20** - Runtime JavaScript
- **TypeScript** - Tipagem estática
- **Express** - Framework web
- **Multer** - Middleware para upload de arquivos
- **FFmpeg** - Conversão de vídeo para HLS
- **Socket.io** - WebSocket para comunicação em tempo real
- **CORS** - Cross-Origin Resource Sharing
- **UUID** - Geração de IDs únicos

### Frontend
- **Next.js 15** - Framework React
- **React 19** - Biblioteca UI
- **TypeScript** - Tipagem estática
- **Tailwind CSS 4** - Framework CSS utility-first
- **HLS.js** - Player HLS para navegadores
- **p2p-media-loader-hlsjs** - Integração P2P para HLS.js
- **p2p-media-loader-core** - Core do sistema P2P
- **Socket.io Client** - Cliente WebSocket

### Infraestrutura
- **Docker** - Containerização
- **Docker Compose** - Orquestração de containers
- **WebTorrent** - Protocolo P2P baseado em WebRTC

## 🚀 Benefícios e Vantagens das Tecnologias

### Por que usar P2P para Streaming de Vídeo?

Este projeto utiliza tecnologias de ponta para criar uma solução de streaming P2P eficiente e escalável. Aqui estão os principais benefícios:

#### 💰 Economia de Custos com CDN

- **Redução de até 90% nos custos de CDN**: Quando múltiplos usuários assistem o mesmo conteúdo, eles compartilham dados entre si via P2P, reduzindo drasticamente a carga no servidor
- **Escalabilidade automática**: Quanto mais usuários, maior a capacidade de distribuição P2P
- **Custo-benefício**: Ideal para plataformas de streaming com alto tráfego

#### ⚡ Performance e Escalabilidade do wt-tracker

O [wt-tracker](https://github.com/Novage/wt-tracker) é um tracker WebTorrent de alta performance que oferece:

- **Até 30.000 peers simultâneos** em um VPS com apenas:
  - 2 GiB de memória RAM
  - 1 CPU virtual
- **Otimizações avançadas**:
  - Backend I/O baseado em [uWebSockets.js](https://github.com/uNetworking/uWebSockets), um dos servidores web mais eficientes disponíveis
  - Suporte simultâneo para `ws://` (HTTP) e `wss://` (HTTPS)
  - Suporte para IPv4 e IPv6
  - Compressão configurável para reduzir uso de banda
- **Robustez e confiabilidade**:
  - 100% TypeScript com tipagem estática
  - Testes unitários e CI/CD
  - Análise estática de código
  - Estatísticas em tempo real via `/stats.json`

#### 🌐 P2P Media Loader

O [p2p-media-loader](https://github.com/Novage/p2p-media-loader) é um engine open-source que permite:

- **Streaming P2P direto no navegador**: Sem necessidade de plugins ou extensões
- **Suporte para HLS e DASH**: Compatível com os principais formatos de streaming
- **Fallback automático**: Se o P2P não estiver disponível, continua via HTTP(S)
- **Distribuição inteligente**: Peers aleatórios baixam novos segmentos via HTTP e distribuem via P2P
- **Zero configuração do cliente**: Funciona automaticamente no navegador

#### 🔄 WebTorrent Protocol

O [WebTorrent](https://webtorrent.io/) oferece:

- **Protocolo P2P baseado em WebRTC**: Comunicação direta entre navegadores
- **Sem necessidade de servidores intermediários**: Após a conexão inicial, os peers se comunicam diretamente
- **Segurança nativa**: WebRTC inclui criptografia end-to-end
- **Compatibilidade universal**: Funciona em todos os navegadores modernos

### 📊 Comparação: CDN Tradicional vs P2P

| Aspecto | CDN Tradicional | P2P (Este Projeto) |
|---------|------------------|---------------------|
| **Custo por usuário** | Alto (cresce linearmente) | Baixo (diminui com mais usuários) |
| **Escalabilidade** | Requer mais servidores | Escala automaticamente |
| **Latência** | Depende da distância do CDN | Reduzida (peers próximos) |
| **Infraestrutura** | Servidores dedicados caros | VPS simples (2GB RAM, 1 CPU) |
| **Capacidade** | Limitada pelo servidor | Aumenta com cada novo peer |

### 🎯 Casos de Uso Ideais

- **Plataformas de streaming** com conteúdo popular (muitos usuários assistindo o mesmo vídeo)
- **Eventos ao vivo** com grande audiência simultânea
- **Educação online** com aulas assistidas por muitos alunos
- **Empresas** que precisam reduzir custos de infraestrutura
- **Startups** que querem escalar sem aumentar custos proporcionalmente

### 🔬 Como o wt-tracker Lida com Milhares de Usuários?

1. **uWebSockets.js Backend**: 
   - Implementação C++ de alta performance
   - Gerenciamento eficiente de memória
   - Event loop otimizado para milhares de conexões simultâneas

2. **Otimizações de Código**:
   - Processamento assíncrono não-bloqueante
   - Estruturas de dados eficientes para gerenciar peers
   - Compressão de mensagens WebSocket

3. **Arquitetura Leve**:
   - Apenas sinalização WebRTC (não transmite dados de vídeo)
   - Mensagens pequenas e rápidas
   - Limpeza automática de conexões inativas

4. **Configuração Flexível**:
   - Limites configuráveis de conexões
   - Timeouts ajustáveis
   - Compressão opcional para reduzir banda

## 📝 Notas Importantes

### Armazenamento
- **Vídeos originais:** `back-end/uploads/` (temporários)
- **Vídeos convertidos:** `back-end/videos/{videoId}/` (HLS)
- **Status de conversão:** `back-end/conversions/` (JSON)

### Performance
- A conversão pode levar tempo dependendo do tamanho e resolução do vídeo
- O sistema suporta vídeos de até 2GB (configurável)
- O P2P funciona melhor com múltiplos usuários assistindo o mesmo vídeo
- A economia de CDN aumenta proporcionalmente ao número de peers

### P2P e Economia de CDN
- O cálculo de economia é: `(P2P Download / Total Download) * 100`
- Dados são agregados de todas as sessões ativas via WebSocket
- A economia só é significativa quando há múltiplos peers compartilhando conteúdo

## 🐛 Troubleshooting

### FFmpeg não encontrado
- **Docker:** FFmpeg está incluído na imagem
- **Local:** Certifique-se de que o FFmpeg está instalado e no PATH
  ```bash
  ffmpeg -version  # Verificar instalação
  ```

### Erro de CORS
- Verifique se o backend está rodando em `http://localhost:3001`
- Confirme que `FRONTEND_URL` está configurado corretamente no backend
- Verifique se `NEXT_PUBLIC_API_URL` está correto no frontend

### Vídeo não converte
- Verifique os logs do backend: `docker-compose logs backend`
- Confirme que o arquivo de vídeo é válido e em formato suportado
- Verifique espaço em disco disponível

### Tracker não conecta
- Verifique se o tracker está rodando: `docker-compose ps tracker`
- Confirme que a porta 8000 está livre
- Verifique os logs: `docker-compose logs tracker`
- Confirme que `NEXT_PUBLIC_TRACKER_URL` está correto no frontend

### WebSocket não funciona
- Verifique se o backend está rodando e saudável
- Confirme que Socket.io está configurado corretamente
- Verifique os logs do backend para erros de conexão

### P2P não funciona
- Certifique-se de que o tracker está rodando
- Verifique se há outros peers assistindo o mesmo vídeo
- Confirme que o navegador suporta WebRTC
- Verifique o console do navegador para erros

### Docker issues
- Veja [README-DOCKER.md](./README-DOCKER.md) para troubleshooting específico do Docker
- Rebuild completo: `docker-compose down -v && docker-compose build --no-cache && docker-compose up -d`

## 📚 Documentação Adicional

- [README-DOCKER.md](./README-DOCKER.md) - Guia completo de Docker e Docker Compose

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor:

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 🙏 Agradecimentos

Este projeto utiliza tecnologias open-source de alta qualidade:

- **[HLS.js](https://github.com/video-dev/hls.js/)** - Player HLS para navegadores
- **[p2p-media-loader](https://github.com/Novage/p2p-media-loader)** - Engine P2P para streaming de vídeo no navegador
- **[WebTorrent](https://webtorrent.io/)** - Protocolo P2P baseado em WebRTC para navegadores
- **[wt-tracker](https://github.com/Novage/wt-tracker)** - Tracker WebTorrent de alta performance (até 30k peers com 2GB RAM)
- **[uWebSockets.js](https://github.com/uNetworking/uWebSockets)** - Servidor WebSocket de alta performance usado pelo wt-tracker
