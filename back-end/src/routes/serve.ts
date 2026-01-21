import { Router } from 'express';
import path from 'path';
import fs from 'fs';

const router = Router();

// Servir arquivos HLS (m3u8 e segmentos .ts)
router.get('/:videoId/:filename', (req, res) => {
  try {
    const { videoId, filename } = req.params;
    const videoDir = path.join(__dirname, '../../videos', videoId);
    const filePath = path.join(videoDir, filename);

    // Verificar se o arquivo existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }

    // Configurar headers apropriados
    if (filename.endsWith('.m3u8')) {
      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');
    } else if (filename.endsWith('.ts')) {
      res.setHeader('Content-Type', 'video/mp2t');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');
    }

    // Enviar arquivo
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error: any) {
    res.status(500).json({
      error: 'Erro ao servir arquivo',
      message: error.message || 'Erro desconhecido',
    });
  }
});

// Rota alternativa para servir apenas o m3u8 (sem videoId na URL)
router.get('/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    
    // Procurar o arquivo em todos os diretórios de vídeo
    const videosDir = path.join(__dirname, '../../videos');
    
    if (!fs.existsSync(videosDir)) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }

    const videoFolders = fs.readdirSync(videosDir, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);

    for (const folder of videoFolders) {
      const filePath = path.join(videosDir, folder, filename);
      if (fs.existsSync(filePath)) {
        // Configurar headers
        if (filename.endsWith('.m3u8')) {
          res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
          res.setHeader('Access-Control-Allow-Origin', '*');
        } else if (filename.endsWith('.ts')) {
          res.setHeader('Content-Type', 'video/mp2t');
          res.setHeader('Access-Control-Allow-Origin', '*');
        }

        const fileStream = fs.createReadStream(filePath);
        return fileStream.pipe(res);
      }
    }

    res.status(404).json({ error: 'Arquivo não encontrado' });
  } catch (error: any) {
    res.status(500).json({
      error: 'Erro ao servir arquivo',
      message: error.message || 'Erro desconhecido',
    });
  }
});

export { router as serveRouter };
