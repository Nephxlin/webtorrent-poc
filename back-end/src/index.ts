import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { uploadRouter } from './routes/upload';
import { videosRouter } from './routes/videos';
import { serveRouter } from './routes/serve';
import { conversionRouter } from './routes/conversion';
import { statsAggregator, SessionStats } from './services/statsAggregator';

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true, // Permitir Engine.IO v3 para compatibilidade
});

const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Criar diretórios necessários
const uploadsDir = path.join(__dirname, '../uploads');
const videosDir = path.join(__dirname, '../videos');

[uploadsDir, videosDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Rotas
app.use('/api/upload', uploadRouter);
app.use('/api/videos', videosRouter);
app.use('/api/serve', serveRouter);
app.use('/api/conversion', conversionRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend está funcionando' });
});

// WebSocket: Gerenciar conexões e estatísticas
io.on('connection', (socket) => {
  const sessionId = socket.id;

  // Quando o cliente envia estatísticas
  socket.on('stats:update', (stats: Omit<SessionStats, 'sessionId' | 'lastUpdate'>) => {
    statsAggregator.updateSession(sessionId, stats);
    
    // Enviar estatísticas agregadas para todos os clientes
    const aggregated = statsAggregator.getAggregatedStats();
    io.emit('stats:aggregated', aggregated);
  });

  // Quando o cliente desconecta
  socket.on('disconnect', () => {
    statsAggregator.removeSession(sessionId);
    
    // Enviar estatísticas atualizadas após remoção
    const aggregated = statsAggregator.getAggregatedStats();
    io.emit('stats:aggregated', aggregated);
  });

  // Enviar estatísticas iniciais ao conectar
  const initialStats = statsAggregator.getAggregatedStats();
  socket.emit('stats:aggregated', initialStats);
});

// Broadcast periódico de estatísticas agregadas (a cada 2 segundos)
setInterval(() => {
  const aggregated = statsAggregator.getAggregatedStats();
  io.emit('stats:aggregated', aggregated);
}, 2000);

httpServer.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📁 Uploads: ${uploadsDir}`);
  console.log(`📁 Vídeos: ${videosDir}`);
  console.log(`🔌 WebSocket ativo para estatísticas P2P`);
});
