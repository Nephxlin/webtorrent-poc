import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import {
  saveConversionStatus,
  updateConversionProgress,
  markConversionCompleted,
  markConversionFailed,
  ConversionStatus,
} from './conversionTracker';

const execAsync = promisify(exec);

export interface ConversionOptions {
  segmentDuration?: number; // Duração de cada segmento em segundos
  bitrate?: string; // Bitrate do vídeo (ex: '2000k')
  resolution?: string; // Resolução (ex: '1920x1080')
}

export async function convertToHLS(
  inputPath: string,
  fileName: string,
  options: ConversionOptions = {},
  onProgress?: (progress: number, message: string) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const videoId = path.basename(fileName, path.extname(fileName));
    const outputDir = path.join(__dirname, '../../videos', videoId);
    const outputPath = path.join(outputDir, 'playlist.m3u8');

    // Criar diretório de saída
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Salvar metadata
    const metadataPath = path.join(outputDir, 'metadata.json');
    const metadata = {
      originalName: fileName,
      fileName: fileName,
      createdAt: new Date().toISOString(),
    };
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    // Inicializar status de conversão
    const initialStatus: ConversionStatus = {
      videoId,
      status: 'processing',
      progress: 0,
      message: 'Iniciando conversão...',
      startedAt: new Date().toISOString(),
    };
    saveConversionStatus(initialStatus);

    const {
      segmentDuration = 10,
      bitrate = '2000k',
      resolution = '1920x1080',
    } = options;

    // Configurar FFmpeg
    const command = ffmpeg(inputPath)
      .outputOptions([
        '-c:v libx264', // Codec de vídeo
        '-c:a aac', // Codec de áudio
        '-hls_time', segmentDuration.toString(), // Duração de cada segmento
        '-hls_playlist_type', 'vod', // Tipo de playlist (VOD)
        '-hls_segment_filename', path.join(outputDir, 'segment_%03d.ts'), // Nome dos segmentos
        '-hls_flags', 'independent_segments', // Flags HLS
        '-b:v', bitrate, // Bitrate do vídeo
        '-maxrate', bitrate, // Bitrate máximo
        '-bufsize', (parseInt(bitrate) * 2).toString() + 'k', // Buffer size
        '-s', resolution, // Resolução
        '-sc_threshold', '0', // Desabilitar scene change detection
        '-g', (segmentDuration * 30).toString(), // GOP size
        '-keyint_min', (segmentDuration * 30).toString(), // Keyframe interval mínimo
        '-preset', 'medium', // Preset de encoding
        '-crf', '23', // Quality (18-28, menor = melhor qualidade)
      ])
      .output(outputPath)
      .on('start', () => {
        updateConversionProgress(videoId, 5, 'FFmpeg iniciado, analisando vídeo...');
        if (onProgress) onProgress(5, 'FFmpeg iniciado, analisando vídeo...');
      })
      .on('progress', (progress) => {
        if (progress.percent !== undefined) {
          const percent = Math.min(95, Math.max(5, progress.percent));
          const message = `Convertendo: ${Math.round(percent)}%`;
          updateConversionProgress(videoId, percent, message);
          if (onProgress) onProgress(percent, message);
        }
      })
      .on('end', () => {
        markConversionCompleted(videoId);
        if (onProgress) onProgress(100, 'Conversão concluída!');
        resolve(outputPath);
      })
      .on('error', (err) => {
        markConversionFailed(videoId, err.message);
        if (onProgress) onProgress(0, `Erro: ${err.message}`);
        reject(err);
      });

    // Executar conversão
    command.run();
  });
}

// Verificar se FFmpeg está instalado
export async function checkFFmpeg(): Promise<boolean> {
  try {
    await execAsync('ffmpeg -version');
    return true;
  } catch (error) {
    return false;
  }
}
