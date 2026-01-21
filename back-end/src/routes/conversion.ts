import { Router } from 'express';
import { getConversionStatus } from '../services/conversionTracker';

const router = Router();

// Obter status da conversão
router.get('/:videoId', (req, res) => {
  try {
    const { videoId } = req.params;
    const status = getConversionStatus(videoId);

    if (!status) {
      return res.status(404).json({
        error: 'Status de conversão não encontrado',
      });
    }

    res.json(status);
  } catch (error: any) {
    res.status(500).json({
      error: 'Erro ao obter status da conversão',
      message: error.message || 'Erro desconhecido',
    });
  }
});

export { router as conversionRouter };
