import { Router } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

interface VideoInfo {
  id: string;
  originalName: string;
  fileName: string;
  m3u8Url: string;
  createdAt: string;
  size?: number;
}

// Listar todos os vídeos convertidos
router.get('/', (req, res) => {
  try {
    const videosDir = path.join(__dirname, '../../videos');
    const videos: VideoInfo[] = [];

    if (!fs.existsSync(videosDir)) {
      return res.json({ videos: [] });
    }

    const videoFolders = fs.readdirSync(videosDir, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);

    videoFolders.forEach((folderName) => {
      const folderPath = path.join(videosDir, folderName);
      const m3u8Path = path.join(folderPath, 'playlist.m3u8');

      if (fs.existsSync(m3u8Path)) {
        const stats = fs.statSync(m3u8Path);
        const metadataPath = path.join(folderPath, 'metadata.json');

        let originalName = folderName;
        let fileName = folderName;

        if (fs.existsSync(metadataPath)) {
          try {
            const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
            originalName = metadata.originalName || folderName;
            fileName = metadata.fileName || folderName;
          } catch (err) {
            // Erro silencioso ao ler metadata
          }
        }

        videos.push({
          id: folderName,
          originalName,
          fileName,
          m3u8Url: `/api/serve/${folderName}/playlist.m3u8`,
          createdAt: stats.birthtime.toISOString(),
          size: stats.size,
        });
      }
    });

    // Ordenar por data de criação (mais recente primeiro)
    videos.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    res.json({ videos });
  } catch (error: any) {
    res.status(500).json({
      error: 'Erro ao listar vídeos',
      message: error.message || 'Erro desconhecido',
    });
  }
});

// Obter informações de um vídeo específico
router.get('/:id', (req, res) => {
  try {
    const videoId = req.params.id;
    const videoDir = path.join(__dirname, '../../videos', videoId);
    const m3u8Path = path.join(videoDir, 'playlist.m3u8');

    if (!fs.existsSync(m3u8Path)) {
      return res.status(404).json({ error: 'Vídeo não encontrado' });
    }

    const stats = fs.statSync(m3u8Path);
    const metadataPath = path.join(videoDir, 'metadata.json');

    let originalName = videoId;
    let fileName = videoId;

    if (fs.existsSync(metadataPath)) {
      try {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
        originalName = metadata.originalName || videoId;
        fileName = metadata.fileName || videoId;
      } catch (err) {
        // Erro silencioso ao ler metadata
      }
    }

    res.json({
      id: videoId,
      originalName,
      fileName,
      m3u8Url: `/api/serve/${videoId}/playlist.m3u8`,
      createdAt: stats.birthtime.toISOString(),
      size: stats.size,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Erro ao obter vídeo',
      message: error.message || 'Erro desconhecido',
    });
  }
});

// Deletar um vídeo
router.delete('/:id', (req, res) => {
  try {
    const videoId = req.params.id;
    const videoDir = path.join(__dirname, '../../videos', videoId);

    if (!fs.existsSync(videoDir)) {
      return res.status(404).json({ error: 'Vídeo não encontrado' });
    }

    // Remover diretório e todo o conteúdo
    fs.rmSync(videoDir, { recursive: true, force: true });

    res.json({ success: true, message: 'Vídeo deletado com sucesso' });
  } catch (error: any) {
    res.status(500).json({
      error: 'Erro ao deletar vídeo',
      message: error.message || 'Erro desconhecido',
    });
  }
});

export { router as videosRouter };
