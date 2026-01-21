'use client';

import { useEffect, useRef, useState } from 'react';
import PeerNetworkGraph from './PeerNetworkGraph';
import { io, Socket } from 'socket.io-client';

// Importações dinâmicas para evitar problemas de SSR
let Hls: any = null;
let HlsJsP2PEngine: any = null;

// Carregar bibliotecas apenas no cliente
if (typeof window !== 'undefined') {
  try {
    const hlsModule = require('hls.js');
    Hls = hlsModule.default || hlsModule;
    
    const p2pModule = require('p2p-media-loader-hlsjs');
    HlsJsP2PEngine = p2pModule.HlsJsP2PEngine;
    
  } catch (err) {
    // Erro silencioso - será tratado na verificação de suporte
  }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const TRACKER_URL = process.env.NEXT_PUBLIC_TRACKER_URL || 'ws://localhost:8000';

interface P2PVideoPlayerProps {
  src: string;
  className?: string;
  autoPlay?: boolean;
  controls?: boolean;
}

export default function P2PVideoPlayer({
  src,
  className = '',
  autoPlay = false,
  controls = true,
}: P2PVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const p2pStatsRef = useRef({
    peers: 0,
    downloaded: 0,
    downloadedP2P: 0,
    downloadedHTTP: 0,
    uploaded: 0,
  });
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [p2pStats, setP2pStats] = useState({
    peers: 0,
    downloaded: 0, // Total (HTTP + P2P)
    downloadedP2P: 0, // Apenas P2P
    downloadedHTTP: 0, // Apenas HTTP
    uploaded: 0,
  });
  const [connectedPeers, setConnectedPeers] = useState<string[]>([]);
  const [buffering, setBuffering] = useState(false);
  const [bufferProgress, setBufferProgress] = useState(0);

  // Verificar suporte do navegador assim que o componente montar
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const checkSupport = () => {
      try {
        if (!Hls || typeof Hls.isSupported !== 'function') {
          setIsSupported(false);
          setError('HLS.js não foi inicializado corretamente');
          return;
        }
        
        const supported = Hls.isSupported();
        setIsSupported(supported);
        
        if (!supported) {
          setError('HLS.js não é suportado neste navegador. Tente usar Chrome, Firefox ou Edge.');
        }
      } catch (err) {
        setIsSupported(false);
        setError(`Erro ao verificar suporte do navegador: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
      }
    };

    checkSupport();
    const timeout = setTimeout(checkSupport, 500);

    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) {
      if (!src) {
        setIsLoading(false);
      }
      return;
    }

    // Se não for suportado, não tentar inicializar
    if (isSupported === false) {
      return;
    }

    // Limpar instância anterior se existir
    if (hlsRef.current) {
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Resetar estatísticas e peers
    setP2pStats({
      peers: 0,
      downloaded: 0,
      downloadedP2P: 0,
      downloadedHTTP: 0,
      uploaded: 0,
    });
    setConnectedPeers([]);
    
    // Nota: Os acumuladores totalDownloaded e totalUploaded serão resetados
    // quando a nova instância do P2P engine for criada

    // Verificar se as bibliotecas estão carregadas
    if (!Hls || !HlsJsP2PEngine) {
      setError('Bibliotecas não foram carregadas corretamente');
      setIsLoading(false);
      return;
    }

    // Verificar novamente se HLS.js é suportado
    if (!Hls.isSupported()) {
      setError('HLS.js não é suportado neste navegador');
      setIsSupported(false);
      setIsLoading(false);
      return;
    }

    setError(null);
    setIsLoading(true);

    // Injetar P2P capabilities no HLS.js
    let HlsWithP2P;
    try {
      HlsWithP2P = HlsJsP2PEngine.injectMixin(Hls);
    } catch (err) {
      setError('Erro ao inicializar P2P engine');
      setIsLoading(false);
      return;
    }

    // Criar instância do HLS com P2P
    const hls = new HlsWithP2P({
      // Configurações do HLS.js para evitar problemas com ArrayBuffer
      maxBufferLength: 30,
      maxMaxBufferLength: 60,
      maxBufferSize: 60 * 1000 * 1000, // 60MB
      maxBufferHole: 0.5,
      highBufferWatchdogPeriod: 2,
      nudgeOffset: 0.1,
      nudgeMaxRetry: 3,
      maxFragLoadingTimeMs: 20000,
      fragLoadingTimeOut: 20000,
      manifestLoadingTimeOut: 10000,
      levelLoadingTimeOut: 10000,
      // Desabilitar worker para evitar problemas com ArrayBuffer transfer
      enableWorker: false,
      // Configurações P2P
      p2p: {
        core: {
          simultaneousHttpDownloads: 10,
          p2pErrorRetries: 10,
          swarmId: src, // Usar a URL como swarmId para agrupar peers do mesmo stream
          // Usar APENAS o tracker local wt-tracker para descoberta de peers
          // Isso substitui os trackers públicos padrão
          announceTrackers: [TRACKER_URL],
        },
        // Interceptar erros do P2P engine antes que causem problemas
        onError: (error: any) => {
          // Ignorar erros de ArrayBuffer detached silenciosamente
          if (error && error.message && 
              (error.message.includes('ArrayBuffer') || 
               error.message.includes('detached') ||
               error.message.includes('slice'))) {
            return; // Não propagar o erro
          }
        },
        onHlsJsCreated: (hlsInstance: any) => {
          // Rastrear peers manualmente através dos eventos
          let trackedPeers = new Set<string>();
          
          // Acumuladores de estatísticas (baseado em eventos)
          let totalDownloaded = 0; // Total (HTTP + P2P)
          let totalDownloadedP2P = 0; // Apenas P2P
          let totalDownloadedHTTP = 0; // Apenas HTTP
          let totalUploaded = 0;
          
          // Função para atualizar lista de peers
          const updatePeerList = () => {
            setConnectedPeers(Array.from(trackedPeers));
          };

          // Event listeners para estatísticas P2P
          if (hlsInstance.p2pEngine) {
            const p2pEngine = hlsInstance.p2pEngine;
            
            // Interceptar erros do P2P engine para evitar crashes
            const handleP2PError = (error: any) => {
              // Ignorar erros de ArrayBuffer detached
              if (error && (
                (error.message && (error.message.includes('ArrayBuffer') || error.message.includes('detached') || error.message.includes('slice'))) ||
                (error.toString && error.toString().includes('ArrayBuffer'))
              )) {
                return;
              }
            };

            const handlePeerConnect = (params: any) => {
              const peerId = params.peerId || params;
              if (peerId) {
                trackedPeers.add(peerId);
                updatePeerList();
              }
              setP2pStats((prev) => ({
                ...prev,
                peers: trackedPeers.size,
              }));
            };

            const handlePeerClose = (params: any) => {
              const peerId = params.peerId || params;
              if (peerId) {
                trackedPeers.delete(peerId);
                updatePeerList();
              }
              setP2pStats((prev) => ({
                ...prev,
                peers: trackedPeers.size,
              }));
            };

            // Rastrear segmentos já contabilizados para evitar duplicação
            const processedSegments = new Set<string>();
            // Rastrear chunks processados para evitar duplicação com segmentLoaded
            const processedChunks = new Set<string>();

            // Event handlers para rastrear download/upload via eventos
            // NOTA: chunkDownloaded é desabilitado para downloads porque segmentLoaded já conta os segmentos completos
            // chunkDownloaded só seria útil se quisermos contar chunks individuais que não fazem parte de segmentos
            // Mas isso causaria duplicação, então vamos usar apenas segmentLoaded para downloads
            const handleChunkDownloaded = (data: any) => {
              // DESABILITADO: Usar apenas segmentLoaded para evitar duplicação
              // Chunks individuais já estão incluídos nos segmentos completos
              return;
            };

            const handleChunkUploaded = (data: any) => {
              try {
                // Pode ser um número direto ou um objeto
                let bytes = 0;
                if (typeof data === 'number') {
                  bytes = data;
                } else if (data && typeof data === 'object') {
                  bytes = data.bytesLength || data.length || data.size || data.bytes || 0;
                }
                
                if (bytes > 0) {
                  totalUploaded += bytes;
                  
                  setP2pStats((prev) => {
                    // Só atualizar se houver mudança significativa (>512 bytes) ou se for a primeira vez
                    const hasSignificantChange = 
                      Math.abs(totalUploaded - prev.uploaded) > 512 ||
                      Math.abs(totalDownloaded - prev.downloaded) > 512 ||
                      Math.abs(totalDownloadedP2P - prev.downloadedP2P) > 512 ||
                      Math.abs(totalDownloadedHTTP - prev.downloadedHTTP) > 512 ||
                      trackedPeers.size !== prev.peers ||
                      (totalUploaded > 0 && prev.uploaded === 0) ||
                      (totalDownloaded > 0 && prev.downloaded === 0);
                    
                    if (hasSignificantChange) {
                      return {
                        downloaded: totalDownloaded,
                        downloadedP2P: totalDownloadedP2P,
                        downloadedHTTP: totalDownloadedHTTP,
                        uploaded: totalUploaded,
                        peers: trackedPeers.size,
                      };
                    }
                    // Retornar o estado anterior se não houver mudança significativa
                    return prev;
                  });
                }
              } catch (err) {
                // Ignorar erros silenciosamente
              }
            };

            const handleSegmentLoaded = (data: any) => {
              try {
                // Sempre é um objeto com bytesLength e downloadSource
                if (data && typeof data === 'object') {
                  const segmentUrl = data.segmentUrl || data.url || '';
                  const bytes = data.bytesLength || data.length || data.size || data.bytes || 0;
                  const downloadSource = data.downloadSource || data.source;
                  
                  // Evitar duplicação: usar segmentUrl como chave única
                  // Também usar uma chave composta com o tamanho para evitar problemas com URLs duplicadas
                  const segmentKey = segmentUrl ? `${segmentUrl}:${bytes}` : `${Date.now()}:${bytes}`;
                  
                  if (processedSegments.has(segmentKey)) {
                    return; // Já processado, não contar novamente
                  }
                  
                  if (bytes > 0) {
                    // Marcar como processado
                    processedSegments.add(segmentKey);
                    
                    // Verificar se é P2P ou HTTP
                    const isP2P = downloadSource === 'p2p' || data.fromPeer || data.p2p || false;
                    
                    totalDownloaded += bytes;
                    if (isP2P) {
                      totalDownloadedP2P += bytes;
            } else {
                      totalDownloadedHTTP += bytes;
                    }
                    
                    setP2pStats((prev) => {
                      // Só atualizar se houver mudança significativa (>512 bytes) ou se for a primeira vez
                      const hasSignificantChange = 
                        Math.abs(totalDownloaded - prev.downloaded) > 512 ||
                        Math.abs(totalDownloadedP2P - prev.downloadedP2P) > 512 ||
                        Math.abs(totalDownloadedHTTP - prev.downloadedHTTP) > 512 ||
                        Math.abs(totalUploaded - prev.uploaded) > 512 ||
                        trackedPeers.size !== prev.peers ||
                        (totalDownloaded > 0 && prev.downloaded === 0) ||
                        (totalUploaded > 0 && prev.uploaded === 0);
                      
                      if (hasSignificantChange) {
                        return {
                          downloaded: totalDownloaded,
                          downloadedP2P: totalDownloadedP2P,
                          downloadedHTTP: totalDownloadedHTTP,
                          uploaded: totalUploaded,
                          peers: trackedPeers.size,
                        };
                      }
                      return prev;
                    });
                      }
                    }
                  } catch (err) {
                    // Ignorar erros silenciosamente
                  }
                };

            // Event listeners para conexão/desconexão de peers e erros
            const eventNames = {
              peerConnect: ['onPeerConnect', 'peerConnect'],
              peerClose: ['onPeerClose', 'peerClose'],
              error: ['error'],
              chunkDownloaded: ['onChunkDownloaded', 'chunkDownloaded', 'chunk-downloaded', 'OnChunkDownloaded'],
              chunkUploaded: ['onChunkUploaded', 'chunkUploaded', 'chunk-uploaded', 'OnChunkUploaded'],
              segmentLoaded: ['onSegmentLoaded', 'segmentLoaded', 'segment-loaded', 'OnSegmentLoaded'],
            };

            // Registrar eventos no p2pEngine
            // IMPORTANTE: Registrar apenas uma vez para evitar duplicação
            // Preferir p2pEngine sobre core para evitar contagem duplicada
            if (typeof p2pEngine.addEventListener === 'function') {
              p2pEngine.addEventListener('onPeerConnect', handlePeerConnect);
              p2pEngine.addEventListener('onPeerClose', handlePeerClose);
              p2pEngine.addEventListener('error', handleP2PError);
              // NÃO registrar chunkDownloaded para downloads (causa duplicação com segmentLoaded)
              // Apenas registrar chunkUploaded e segmentLoaded
              eventNames.chunkUploaded.forEach(name => {
                try { p2pEngine.addEventListener(name, handleChunkUploaded); } catch (e) {}
              });
              eventNames.segmentLoaded.forEach(name => {
                try { p2pEngine.addEventListener(name, handleSegmentLoaded); } catch (e) {}
              });
            } else if (typeof p2pEngine.on === 'function') {
              p2pEngine.on('peerConnect', handlePeerConnect);
              p2pEngine.on('peerClose', handlePeerClose);
              p2pEngine.on('error', handleP2PError);
              // NÃO registrar chunkDownloaded para downloads (causa duplicação com segmentLoaded)
              eventNames.chunkUploaded.forEach(name => {
                try { p2pEngine.on(name, handleChunkUploaded); } catch (e) {}
              });
              eventNames.segmentLoaded.forEach(name => {
                try { p2pEngine.on(name, handleSegmentLoaded); } catch (e) {}
              });
            }
            
            // Obter referência ao core
            const core = p2pEngine.core;
            
            // NÃO registrar eventos no core para evitar duplicação
            // Os eventos já estão sendo capturados no p2pEngine
            // Apenas registrar handler de erro no core se necessário
            if (core) {
              if (typeof core.on === 'function') {
                core.on('error', handleP2PError);
              } else if (typeof core.addEventListener === 'function') {
                core.addEventListener('error', handleP2PError);
              }
            }

            // Função para obter estatísticas do core através dos loaders
            // NOTA: Esta função NÃO é mais usada para atualizar estatísticas
            // Ela foi mantida apenas como fallback, mas sempre retorna os valores dos eventos
            // para evitar duplicação e garantir precisão
            const getStatsFromCore = () => {
              try {
                // SEMPRE retornar apenas os valores acumulados dos eventos
                // Os valores do core podem estar duplicados ou incorretos
                // Os eventos segmentLoaded são a fonte mais confiável
                return {
                  peers: trackedPeers.size,
                  downloaded: totalDownloaded,
                  downloadedP2P: totalDownloadedP2P,
                  downloadedHTTP: totalDownloadedHTTP,
                  uploaded: totalUploaded,
                };
              } catch (err) {
                // Retornar valores dos eventos em caso de erro
                return {
                  peers: trackedPeers.size,
                  downloaded: totalDownloaded,
                  downloadedP2P: totalDownloadedP2P,
                  downloadedHTTP: totalDownloadedHTTP,
                  uploaded: totalUploaded,
                };
              }
            };

            // Função para atualizar estatísticas periodicamente
            // SEMPRE usar os valores acumulados dos eventos (são mais confiáveis)
            const updateStats = () => {
              const stats = {
                peers: trackedPeers.size,
                downloaded: totalDownloaded,
                downloadedP2P: totalDownloadedP2P,
                downloadedHTTP: totalDownloadedHTTP,
                uploaded: totalUploaded,
              };
              
              setP2pStats((prev) => {
                // Atualizar sempre que houver qualquer mudança (threshold menor)
                const hasChanges = 
                  stats.peers !== prev.peers ||
                  Math.abs(stats.downloaded - prev.downloaded) > 512 || // 512 bytes de diferença
                  Math.abs(stats.downloadedP2P - prev.downloadedP2P) > 512 ||
                  Math.abs(stats.downloadedHTTP - prev.downloadedHTTP) > 512 ||
                  Math.abs(stats.uploaded - prev.uploaded) > 512 ||
                  (stats.downloaded > 0 && prev.downloaded === 0) ||
                  (stats.uploaded > 0 && prev.uploaded === 0);

                if (hasChanges) {
                  return stats;
                }
                return prev;
              });
            };

            // Atualizar imediatamente
            updateStats();

            // Atualizar periodicamente a cada segundo
            statsIntervalRef.current = setInterval(updateStats, 1000);

            // Também registrar listener para o evento stats como backup
            // Mas NÃO sobrescrever os valores acumulados dos eventos
            const handleStats = (stats: any) => {
              try {
                // Apenas usar se os valores dos eventos ainda forem zero
                // Isso evita sobrescrever os valores acumulados dos eventos
                if (stats && (stats.downloaded || stats.uploaded)) {
                  setP2pStats((prev) => {
                    // Só atualizar se os valores acumulados ainda forem zero
                    // Caso contrário, manter os valores dos eventos (são mais precisos)
                    if (totalDownloaded === 0 && totalUploaded === 0) {
                      return {
                        peers: trackedPeers.size,
                        downloaded: stats.downloaded || stats.downloadedBytes || stats.downloadedTotal || prev.downloaded,
                        downloadedP2P: stats.downloadedP2P || stats.p2pDownloaded || prev.downloadedP2P,
                        downloadedHTTP: stats.downloadedHTTP || stats.httpDownloaded || prev.downloadedHTTP,
                        uploaded: stats.uploaded || stats.uploadedBytes || stats.uploadedTotal || prev.uploaded,
                      };
              }
                    // Manter os valores acumulados dos eventos
                    return {
                      peers: trackedPeers.size,
                      downloaded: totalDownloaded,
                      downloadedP2P: totalDownloadedP2P,
                      downloadedHTTP: totalDownloadedHTTP,
                      uploaded: totalUploaded,
                    };
                  });
                }
              } catch (err) {
                // Ignorar erros
              }
            };

            // Registrar listener para o evento stats como backup
            if (typeof p2pEngine.on === 'function') {
              p2pEngine.on('stats', handleStats);
            } else if (typeof p2pEngine.addEventListener === 'function') {
              p2pEngine.addEventListener('stats', handleStats);
            }
            
            if (core && typeof core.on === 'function') {
              core.on('stats', handleStats);
            } else if (core && typeof core.addEventListener === 'function') {
              core.addEventListener('stats', handleStats);
            }
          }
        },
      },
    });

    hlsRef.current = hls;

    // Proteção contra ArrayBuffer detached: interceptar ArrayBuffer.slice
    const originalSlice = ArrayBuffer.prototype.slice;
    let slicePatchApplied = false;
    
    const safeSlice = function(this: ArrayBuffer, start?: number, end?: number): ArrayBuffer {
      try {
        // Verificar se o buffer está detached tentando acessar byteLength
        const byteLength = this.byteLength;
        return originalSlice.call(this, start, end);
      } catch (err: any) {
        // Se o buffer está detached, retornar um buffer vazio
        if (err && (err.message?.includes('detached') || err.message?.includes('ArrayBuffer'))) {
          return new ArrayBuffer(0);
        }
        throw err;
      }
    };

    // Aplicar o patch apenas uma vez
    if (!slicePatchApplied) {
      try {
        ArrayBuffer.prototype.slice = safeSlice;
        slicePatchApplied = true;
      } catch (err) {
        // Se não conseguir fazer o patch, continuar normalmente
      }
    }

    // Adicionar listener global para erros não capturados do P2P engine
    const globalErrorHandler = (event: ErrorEvent) => {
      if (event.error && event.error.message) {
        const msg = event.error.message;
        if (msg.includes('ArrayBuffer') && (msg.includes('detached') || msg.includes('slice'))) {
          // Prevenir que o erro seja propagado
          event.preventDefault();
          event.stopPropagation();
          return false;
        }
      }
      return true;
    };

    // Handler para promises rejeitadas
    const unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
      if (event.reason && event.reason.message) {
        const msg = event.reason.message;
        if (msg.includes('ArrayBuffer') && (msg.includes('detached') || msg.includes('slice'))) {
          event.preventDefault();
          return false;
        }
      }
      return true;
    };

    window.addEventListener('error', globalErrorHandler);
    window.addEventListener('unhandledrejection', unhandledRejectionHandler);

    // Handlers para buffering
    const handleWaiting = () => {
      setBuffering(true);
    };

    const handleCanPlay = () => {
      setBuffering(false);
    };

    const handleProgress = () => {
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        const duration = video.duration;
        if (duration > 0) {
          const progress = (bufferedEnd / duration) * 100;
          setBufferProgress(Math.min(100, progress));
        }
      }
    };

    const handleLoadedMetadata = () => {
      setBuffering(false);
    };

    // Event listeners do HLS
    const handleManifestParsed = () => {
      setIsLoading(false);
      if (autoPlay) {
        video.play().catch(() => {
          // Erro silencioso ao reproduzir automaticamente
        });
      }
    };

    const handleError = (event: any, data: any) => {
      // Erros não fatais comuns que podem ser ignorados
      const ignorableErrors = [
        'fragParsingError',
        'fragLoadError',
        'bufferAppendingError',
        'bufferStalledError',
      ];

      const errorDetails = data.details || 'Erro desconhecido';

      if (data.fatal) {
        const errorType = data.type;
        
        // Tratar erro de ArrayBuffer detached como erro recuperável
        if (errorDetails === 'internalException' && 
            data.err && 
            data.err.message && 
            data.err.message.includes('ArrayBuffer') &&
            data.err.message.includes('detached')) {
          try {
            // Tentar recuperar destruindo e recriando
            hls.destroy();
            setTimeout(() => {
              try {
                const newHls = new HlsWithP2P({
                  maxBufferLength: 30,
                  maxMaxBufferLength: 60,
                  maxBufferSize: 60 * 1000 * 1000,
                  enableWorker: false,
                  p2p: {
                    core: {
                      simultaneousHttpDownloads: 10,
                      p2pErrorRetries: 10,
                      swarmId: src,
                      announceTrackers: [TRACKER_URL],
                    },
                    onHlsJsCreated: (hlsInstance: any) => {
                      // Reconfigurar listeners (código similar ao original)
                      if (hlsInstance.p2pEngine) {
                        let trackedPeers = new Set<string>();
                        const updatePeerList = () => {
                          setConnectedPeers(Array.from(trackedPeers));
                        };
                        
                        const handlePeerConnect = (params: any) => {
                          const peerId = params.peerId || params;
                          if (peerId) {
                            trackedPeers.add(peerId);
                            updatePeerList();
                          }
                          setP2pStats((prev) => ({
                            ...prev,
                            peers: trackedPeers.size,
                          }));
                        };

                        const handlePeerClose = (params: any) => {
                          const peerId = params.peerId || params;
                          if (peerId) {
                            trackedPeers.delete(peerId);
                            updatePeerList();
                          }
                          setP2pStats((prev) => ({
                            ...prev,
                            peers: trackedPeers.size,
                          }));
                        };

                        if (typeof hlsInstance.p2pEngine.addEventListener === 'function') {
                          hlsInstance.p2pEngine.addEventListener('onPeerConnect', handlePeerConnect);
                          hlsInstance.p2pEngine.addEventListener('onPeerClose', handlePeerClose);
                        } else if (typeof hlsInstance.p2pEngine.on === 'function') {
                          hlsInstance.p2pEngine.on('peerConnect', handlePeerConnect);
                          hlsInstance.p2pEngine.on('peerClose', handlePeerClose);
                        }
                      }
                    },
                  },
                });
                
                newHls.attachMedia(video);
                newHls.loadSource(src);
                hlsRef.current = newHls;
              } catch (err) {
                setError('Erro ao recuperar o player. Recarregue a página.');
              }
            }, 500);
          } catch (err) {
            setError('Erro fatal no player. Recarregue a página.');
          }
          return;
        }
        
        // Outros erros fatais
        if (errorType === 2 || errorType === 'networkError' || (Hls && errorType === Hls.ErrorTypes?.NETWORK_ERROR)) {
          hls.startLoad();
        } else if (errorType === 3 || errorType === 'mediaError' || (Hls && errorType === Hls.ErrorTypes?.MEDIA_ERROR)) {
          hls.recoverMediaError();
        } else {
          hls.destroy();
          setIsLoading(false);
          setError(`Erro ao carregar o vídeo: ${errorDetails || 'Erro desconhecido'}`);
        }
      }
    };

    // Usar valores de eventos do HLS
    const manifestParsedEvent = Hls?.Events?.MANIFEST_PARSED || 'hlsManifestParsed';
    const errorEvent = Hls?.Events?.ERROR || 'hlsError';
    
    hls.on(manifestParsedEvent, handleManifestParsed);
    hls.on(errorEvent, handleError);

    // Event listeners do vídeo para buffering
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('progress', handleProgress);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    // Anexar o vídeo e carregar a fonte
    try {
      hls.attachMedia(video);
      hls.loadSource(src);
    } catch (err) {
      setIsLoading(false);
      setError('Erro ao carregar o stream. Verifique se a URL é válida.');
    }

    // Cleanup
    return () => {
      // Remover handlers globais de erros
      window.removeEventListener('error', globalErrorHandler);
      window.removeEventListener('unhandledrejection', unhandledRejectionHandler);
      
      // Restaurar ArrayBuffer.slice original se foi aplicado o patch
      if (slicePatchApplied) {
        try {
          ArrayBuffer.prototype.slice = originalSlice;
          slicePatchApplied = false;
        } catch (err) {
          // Ignorar erros ao restaurar
        }
      }
      
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }
      if (hlsRef.current) {
        try {
          // Remover listeners do HLS
          const manifestParsedEvent = Hls?.Events?.MANIFEST_PARSED || 'hlsManifestParsed';
          const errorEvent = Hls?.Events?.ERROR || 'hlsError';
          hlsRef.current.off(manifestParsedEvent, handleManifestParsed);
          hlsRef.current.off(errorEvent, handleError);

          // Remover listeners do vídeo
          if (videoRef.current) {
            videoRef.current.removeEventListener('waiting', handleWaiting);
            videoRef.current.removeEventListener('canplay', handleCanPlay);
            videoRef.current.removeEventListener('progress', handleProgress);
            videoRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
          }
          
          // Remover listeners do P2P engine se existir
          if (hlsRef.current.p2pEngine) {
            try {
              if (typeof hlsRef.current.p2pEngine.off === 'function') {
                hlsRef.current.p2pEngine.off('stats');
                hlsRef.current.p2pEngine.off('peerConnect');
                hlsRef.current.p2pEngine.off('peerClose');
              } else if (typeof hlsRef.current.p2pEngine.removeEventListener === 'function') {
                hlsRef.current.p2pEngine.removeEventListener('stats');
                hlsRef.current.p2pEngine.removeEventListener('onPeerConnect');
                hlsRef.current.p2pEngine.removeEventListener('onPeerClose');
              }
            } catch (err) {
              // Erro silencioso ao remover listeners
            }
          }
          
          hlsRef.current.destroy();
        } catch (err) {
          // Erro silencioso durante cleanup
        }
        hlsRef.current = null;
      }
    };
  }, [src, autoPlay, isSupported]);

  // Sincronizar ref com estado para acesso no WebSocket
  useEffect(() => {
    p2pStatsRef.current = p2pStats;
  }, [p2pStats]);

  // WebSocket: Conectar e enviar estatísticas periodicamente
  // IMPORTANTE: Não incluir p2pStats nas dependências para evitar recriar a conexão
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Conectar ao WebSocket apenas uma vez
    const socket = io(API_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 10,
      timeout: 10000,
      forceNew: false, // Reutilizar conexão existente se possível
    });

    socketRef.current = socket;

    // Enviar estatísticas periodicamente (a cada 2 segundos)
    // Usar a ref para acessar o estado mais recente sem causar re-renders
    const statsInterval = setInterval(() => {
      if (socket.connected) {
        const currentStats = p2pStatsRef.current;
        socket.emit('stats:update', {
          downloaded: currentStats.downloaded,
          downloadedP2P: currentStats.downloadedP2P,
          downloadedHTTP: currentStats.downloadedHTTP,
          uploaded: currentStats.uploaded,
          peers: currentStats.peers,
        });
      }
    }, 2000);

    // Cleanup
    return () => {
      clearInterval(statsInterval);
      if (socket && socket.connected) {
        socket.disconnect();
      }
    };
  }, []); // Array vazio = executar apenas uma vez na montagem

  if (error) {
    return (
      <div className={`p-8 text-center bg-gray-800 rounded-lg text-red-400 ${className}`}>
        <p>Erro: {error}</p>
      </div>
    );
  }

  if (isSupported === null) {
    return (
      <div className={`p-8 text-center bg-gray-800 rounded-lg text-gray-300 ${className}`}>
        <p>Verificando suporte do navegador...</p>
      </div>
    );
  }

  if (isSupported === false) {
    return (
      <div className={`p-8 text-center bg-gray-800 rounded-lg text-red-400 ${className}`}>
        <p>HLS.js não é suportado neste navegador. Por favor, use um navegador moderno.</p>
      </div>
    );
  }

  return (
    <div className={`w-full bg-black rounded-lg overflow-hidden relative ${className}`}>
      {isLoading && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white z-10 bg-linear-to-br from-black/90 to-gray-900/90 backdrop-blur-xl px-10 py-6 rounded-2xl border border-gray-700/50 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-lg font-semibold">Carregando stream...</span>
          </div>
        </div>
      )}
      {buffering && (
        <div className="absolute top-6 left-6 z-20 bg-linear-to-br from-black/90 to-gray-900/90 backdrop-blur-xl px-6 py-4 rounded-2xl border border-blue-500/50 shadow-2xl shadow-blue-500/20">
          <div className="flex items-center gap-4">
            <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin shadow-lg shadow-blue-400/50"></div>
            <div className="flex flex-col gap-2">
              <span className="text-white text-base font-semibold">Buffering...</span>
              <div className="w-40 h-2 bg-gray-800/60 rounded-full overflow-hidden shadow-inner border border-gray-700/50">
                <div
                  className="h-full bg-linear-to-r from-blue-500 via-purple-500 to-blue-500 rounded-full transition-all duration-500 shadow-lg"
                  style={{ width: `${bufferProgress}%`, backgroundSize: '200% 100%' }}
                ></div>
              </div>
              <span className="text-xs text-gray-300 font-medium">{Math.round(bufferProgress)}% carregado</span>
            </div>
          </div>
        </div>
      )}
      <video
        ref={videoRef}
        controls={controls}
        className="block w-full h-auto max-h-[80vh]"
        preload="auto"
      />
      <div className="p-8 bg-linear-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95 border-t border-gray-700/50 backdrop-blur-sm">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Seção de Métricas */}
          <div className="space-y-5">
            <h3 className="text-white text-xl font-bold mb-5 flex items-center gap-3">
              <span className="w-1.5 h-8 bg-linear-to-b from-green-400 via-blue-400 to-green-400 rounded-full shadow-lg shadow-green-500/30"></span>
              <span className="bg-linear-to-r from-green-300 via-blue-300 to-green-300 bg-clip-text text-transparent">
                Estatísticas de Transferência
              </span>
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Peers Card */}
              <div className="bg-linear-to-br from-gray-800/90 to-gray-900/90 rounded-xl p-5 border border-gray-700/40 hover:border-green-500/60 transition-all duration-300 hover:shadow-xl hover:shadow-green-500/20 hover:scale-105 group">
                <div className="flex flex-col">
                  <span className="text-gray-400 text-xs uppercase tracking-wider mb-2 font-semibold">Peers</span>
                  <span className="text-green-400 font-bold text-3xl group-hover:scale-110 transition-transform duration-300">{p2pStats.peers}</span>
                </div>
              </div>

              {/* Total Downloaded Card */}
              <div className="bg-linear-to-br from-gray-800/90 to-gray-900/90 rounded-xl p-5 border border-gray-700/40 hover:border-green-500/60 transition-all duration-300 hover:shadow-xl hover:shadow-green-500/20 hover:scale-105 group">
                <div className="flex flex-col">
                  <span className="text-gray-400 text-xs uppercase tracking-wider mb-2 font-semibold">Downloaded</span>
                  <span className="text-green-400 font-bold text-2xl group-hover:scale-110 transition-transform duration-300">
                    {(p2pStats.downloaded / 1024 / 1024).toFixed(2)} <span className="text-sm text-gray-500 font-normal">MB</span>
                  </span>
                </div>
              </div>

              {/* P2P Downloaded Card */}
              <div className="bg-linear-to-br from-gray-800/90 to-gray-900/90 rounded-xl p-5 border border-gray-700/40 hover:border-blue-500/60 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/20 hover:scale-105 group">
                <div className="flex flex-col">
                  <span className="text-gray-400 text-xs uppercase tracking-wider mb-2 font-semibold">P2P</span>
                  <span className="text-blue-400 font-bold text-2xl group-hover:scale-110 transition-transform duration-300">
                    {(p2pStats.downloadedP2P / 1024 / 1024).toFixed(2)} <span className="text-sm text-gray-500 font-normal">MB</span>
                  </span>
                </div>
              </div>

              {/* HTTP Downloaded Card */}
              <div className="bg-linear-to-br from-gray-800/90 to-gray-900/90 rounded-xl p-5 border border-gray-700/40 hover:border-yellow-500/60 transition-all duration-300 hover:shadow-xl hover:shadow-yellow-500/20 hover:scale-105 group">
                <div className="flex flex-col">
                  <span className="text-gray-400 text-xs uppercase tracking-wider mb-2 font-semibold">HTTP</span>
                  <span className="text-yellow-400 font-bold text-2xl group-hover:scale-110 transition-transform duration-300">
                    {(p2pStats.downloadedHTTP / 1024 / 1024).toFixed(2)} <span className="text-sm text-gray-500 font-normal">MB</span>
                  </span>
                </div>
              </div>

              {/* Uploaded Card */}
              <div className="bg-linear-to-br from-gray-800/90 to-gray-900/90 rounded-xl p-5 border border-gray-700/40 hover:border-green-500/60 transition-all duration-300 hover:shadow-xl hover:shadow-green-500/20 hover:scale-105 group col-span-2">
                <div className="flex flex-col">
                  <span className="text-gray-400 text-xs uppercase tracking-wider mb-2 font-semibold">Uploaded</span>
                  <span className="text-green-400 font-bold text-2xl group-hover:scale-110 transition-transform duration-300">
                    {(p2pStats.uploaded / 1024 / 1024).toFixed(2)} <span className="text-sm text-gray-500 font-normal">MB</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Seção de Rede P2P */}
          <div className="space-y-5">
            <h3 className="text-white text-xl font-bold mb-5 flex items-center gap-3">
              <span className="w-1.5 h-8 bg-linear-to-b from-blue-400 via-purple-400 to-blue-400 rounded-full shadow-lg shadow-blue-500/30"></span>
              <span className="bg-linear-to-r from-blue-300 via-purple-300 to-blue-300 bg-clip-text text-transparent">
                Visualização da Rede
              </span>
            </h3>
            <PeerNetworkGraph peers={connectedPeers} />
          </div>
        </div>
      </div>
    </div>
  );
}
