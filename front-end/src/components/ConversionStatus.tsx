'use client';

import { useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ConversionStatusProps {
  videoId: string;
  onComplete?: () => void;
}

interface ConversionStatusData {
  videoId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  message?: string;
  error?: string;
  startedAt: string;
  completedAt?: string;
}

export default function ConversionStatus({ videoId, onComplete }: ConversionStatusProps) {
  const [status, setStatus] = useState<ConversionStatusData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!videoId) return;

    const fetchStatus = async () => {
      try {
        const response = await fetch(`${API_URL}/api/conversion/${videoId}`);
        if (response.ok) {
          const data = await response.json();
          setStatus(data);
          
          if (data.status === 'completed' && onComplete) {
            onComplete();
          }
        } else {
          // Se não encontrar, pode ser que ainda não foi iniciado
          setStatus({
            videoId,
            status: 'pending',
            progress: 0,
            message: 'Aguardando início da conversão...',
            startedAt: new Date().toISOString(),
          });
        }
      } catch (error) {
        // Erro silencioso
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();

    // Atualizar status a cada 2 segundos se ainda estiver processando
    const interval = setInterval(() => {
      if (status?.status === 'processing' || status?.status === 'pending') {
        fetchStatus();
      } else {
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [videoId, status?.status, onComplete]);

  if (loading || !status) {
    return null;
  }

  if (status.status === 'completed') {
    return (
      <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-500/50 rounded-xl p-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
            <span className="text-white text-lg">✓</span>
          </div>
          <div className="flex-1">
            <p className="text-green-300 font-semibold">Conversão concluída!</p>
            <p className="text-sm text-gray-300">{status.message || 'Vídeo pronto para reprodução'}</p>
          </div>
        </div>
      </div>
    );
  }

  if (status.status === 'failed') {
    return (
      <div className="bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/50 rounded-xl p-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
            <span className="text-white text-lg">✕</span>
          </div>
          <div className="flex-1">
            <p className="text-red-300 font-semibold">Erro na conversão</p>
            <p className="text-sm text-gray-300">{status.error || 'Erro desconhecido'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/50 rounded-xl p-4 mb-4">
      <div className="flex items-center gap-4">
        <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <p className="text-blue-300 font-semibold">
              {status.status === 'pending' ? 'Aguardando conversão...' : 'Convertendo vídeo...'}
            </p>
            <span className="text-blue-400 font-bold text-sm">{Math.round(status.progress)}%</span>
          </div>
          <div className="w-full h-2.5 bg-gray-700/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full transition-all duration-500 shadow-lg"
              style={{ width: `${status.progress}%` }}
            ></div>
          </div>
          {status.message && (
            <p className="text-xs text-gray-400 mt-2">{status.message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
