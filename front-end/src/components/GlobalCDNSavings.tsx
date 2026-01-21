'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface AggregatedStats {
  totalDownloaded: number;
  totalDownloadedP2P: number;
  totalDownloadedHTTP: number;
  totalUploaded: number;
  totalPeers: number;
  activeSessions: number;
  cdnSavings: number; // Porcentagem de economia (0-100)
}

export default function GlobalCDNSavings() {
  const [stats, setStats] = useState<AggregatedStats | null>(null);
  const [connected, setConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let ws: Socket | null = null;

    try {
      // Conectar ao WebSocket
      ws = io(API_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 2000,
        reconnectionAttempts: 10,
        timeout: 10000,
        forceNew: false, // Reutilizar conexão existente se possível
      });

      setSocket(ws);

      ws.on('connect', () => {
        setConnected(true);
      });

      ws.on('disconnect', () => {
        setConnected(false);
      });

      ws.on('connect_error', () => {
        setConnected(false);
      });

      // Receber estatísticas agregadas
      ws.on('stats:aggregated', (data: AggregatedStats) => {
        setStats(data);
      });
    } catch (error) {
      setConnected(false);
    }

    // Cleanup
    return () => {
      if (ws && ws.connected) {
        ws.disconnect();
      }
    };
  }, []);

  // Sempre exibir o componente, mesmo sem dados
  // Se não houver stats, usar valores padrão (zero)
  const displayStats = stats || {
    totalDownloaded: 0,
    totalDownloadedP2P: 0,
    totalDownloadedHTTP: 0,
    totalUploaded: 0,
    totalPeers: 0,
    activeSessions: 0,
    cdnSavings: 0,
  };

  const savingsPercentage = Math.min(100, Math.max(0, displayStats.cdnSavings || 0));
  const totalMB = (displayStats.totalDownloaded / 1024 / 1024).toFixed(2);
  const p2pMB = (displayStats.totalDownloadedP2P / 1024 / 1024).toFixed(2);
  const httpMB = (displayStats.totalDownloadedHTTP / 1024 / 1024).toFixed(2);

  return (
    <div className="bg-gradient-to-br from-purple-900/95 via-pink-900/95 to-purple-950/95 backdrop-blur-xl rounded-3xl border border-purple-500/30 shadow-2xl p-8 hover:border-purple-400/50 transition-all duration-500 relative overflow-hidden">
      {/* Efeito de brilho animado */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-600/0 via-purple-400/10 to-purple-600/0 animate-pulse pointer-events-none"></div>
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white text-2xl font-bold flex items-center gap-3">
            <span className="w-2 h-8 bg-gradient-to-b from-purple-400 via-pink-400 to-purple-400 rounded-full shadow-lg shadow-purple-500/50"></span>
            <span className="bg-gradient-to-r from-purple-200 via-pink-200 to-purple-200 bg-clip-text text-transparent">
              Economia Global de CDN
            </span>
          </h3>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'} ${connected ? 'animate-pulse shadow-lg shadow-green-400/50' : ''} transition-all`}></div>
            <span className="text-sm text-gray-300 font-medium px-3 py-1 bg-gray-800/50 rounded-full border border-gray-700/50">
              {displayStats.activeSessions} {displayStats.activeSessions === 1 ? 'sessão' : 'sessões'}
            </span>
            {!stats && (
              <span className="text-xs text-gray-400 italic">
                {connected ? '(Aguardando...)' : '(Conectando...)'}
              </span>
            )}
          </div>
        </div>

        {/* Barra de Progresso Principal */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <span className="text-5xl font-bold text-white drop-shadow-lg">
                {savingsPercentage.toFixed(1)}
              </span>
              <span className="text-lg text-gray-300 font-medium">%</span>
              <span className="text-base text-gray-400 font-medium">de economia</span>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400 mb-1 uppercase tracking-wide">Total de dados</div>
              <div className="text-lg font-bold text-white">
                {totalMB} <span className="text-sm text-gray-400 font-normal">MB</span>
              </div>
            </div>
          </div>
          <div className="w-full bg-gray-800/60 rounded-full h-6 overflow-hidden shadow-inner border border-gray-700/30">
            <div
              className="h-full bg-gradient-to-r from-purple-500 via-pink-500 via-purple-500 to-pink-500 rounded-full shadow-lg flex items-center justify-end pr-3 relative overflow-hidden"
              style={{ width: `${savingsPercentage}%`, backgroundSize: '200% 100%' }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
              {savingsPercentage > 15 && (
                <span className="text-xs font-bold text-white drop-shadow-md relative z-10">
                  {savingsPercentage.toFixed(0)}%
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Estatísticas Detalhadas */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl p-4 border border-gray-700/40 hover:border-purple-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20 group">
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-2 font-semibold">P2P</div>
            <div className="text-2xl font-bold text-purple-300 group-hover:scale-110 transition-transform duration-300">
              {p2pMB} <span className="text-sm text-gray-500 font-normal">MB</span>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              {displayStats.totalDownloaded > 0
                ? ((displayStats.totalDownloadedP2P / displayStats.totalDownloaded) * 100).toFixed(1)
                : '0.0'}% do total
            </div>
          </div>
          <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl p-4 border border-gray-700/40 hover:border-yellow-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-yellow-500/20 group">
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-2 font-semibold">HTTP</div>
            <div className="text-2xl font-bold text-yellow-300 group-hover:scale-110 transition-transform duration-300">
              {httpMB} <span className="text-sm text-gray-500 font-normal">MB</span>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              {displayStats.totalDownloaded > 0
                ? ((displayStats.totalDownloadedHTTP / displayStats.totalDownloaded) * 100).toFixed(1)
                : '0.0'}% do total
            </div>
          </div>
        </div>

        {/* Informações Adicionais */}
        <div className="flex items-center justify-between text-sm text-gray-400 pt-4 border-t border-gray-700/40">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-800/40 rounded-lg">
            <span className="text-lg">👥</span>
            <span className="font-medium">{displayStats.totalPeers} {displayStats.totalPeers === 1 ? 'peer' : 'peers'}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-800/40 rounded-lg">
            <span className="text-lg">⬆️</span>
            <span className="font-medium">{(displayStats.totalUploaded / 1024 / 1024).toFixed(2)} MB enviados</span>
          </div>
        </div>
      </div>
    </div>
  );
}
