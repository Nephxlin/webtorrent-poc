import fs from 'fs';
import path from 'path';

export interface ConversionStatus {
  videoId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  message?: string;
  error?: string;
  startedAt: string;
  completedAt?: string;
}

const conversionsDir = path.join(__dirname, '../../conversions');

// Garantir que o diretório existe
if (!fs.existsSync(conversionsDir)) {
  fs.mkdirSync(conversionsDir, { recursive: true });
}

export function saveConversionStatus(status: ConversionStatus): void {
  const filePath = path.join(conversionsDir, `${status.videoId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(status, null, 2));
}

export function getConversionStatus(videoId: string): ConversionStatus | null {
  const filePath = path.join(conversionsDir, `${videoId}.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

export function updateConversionProgress(
  videoId: string,
  progress: number,
  message?: string
): void {
  const status = getConversionStatus(videoId);
  if (status) {
    status.progress = Math.min(100, Math.max(0, progress));
    if (message) {
      status.message = message;
    }
    saveConversionStatus(status);
  }
}

export function markConversionCompleted(videoId: string): void {
  const status = getConversionStatus(videoId);
  if (status) {
    status.status = 'completed';
    status.progress = 100;
    status.completedAt = new Date().toISOString();
    status.message = 'Conversão concluída com sucesso';
    saveConversionStatus(status);
  }
}

export function markConversionFailed(videoId: string, error: string): void {
  const status = getConversionStatus(videoId);
  if (status) {
    status.status = 'failed';
    status.error = error;
    status.completedAt = new Date().toISOString();
    saveConversionStatus(status);
  }
}
