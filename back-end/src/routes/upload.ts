import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { convertToHLS } from '../services/videoConverter';

const router = Router();

// Configuração do multer para upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadsDir = path.join(__dirname, '../../uploads');
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueId}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024, // 2GB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'video/webm',
      'video/x-matroska',
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não suportado. Use MP4, MOV, AVI, WEBM ou MKV.'));
    }
  },
});

router.post('/', upload.single('video') as any, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const filePath = req.file.path;
    const fileName = req.file.filename;
    const originalName = req.file.originalname;
    const videoId = path.basename(fileName, path.extname(fileName));

    // Retornar resposta imediata e processar em background
    res.json({
      success: true,
      message: 'Vídeo enviado com sucesso. Conversão em andamento...',
      video: {
        id: videoId,
        originalName,
        fileName,
        m3u8Url: `/api/serve/${videoId}/playlist.m3u8`,
        createdAt: new Date().toISOString(),
        status: 'processing',
      },
    });

    // Processar conversão em background
    convertToHLS(filePath, fileName).catch(() => {
      // Erro silencioso - será tratado pelo conversionTracker
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Erro ao processar vídeo',
      message: error.message || 'Erro desconhecido',
    });
  }
});

export { router as uploadRouter };
