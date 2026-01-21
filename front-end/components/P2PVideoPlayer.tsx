'use client';

import { useEffect, useRef, useState } from 'react';
import PeerNetworkGraph from './PeerNetworkGraph';

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
    console.error('Erro ao importar bibliotecas:', err);
  }
}

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
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [p2pStats, setP2pStats] = useState({
    peers: 0,
    downloaded: 0,
    uploaded: 0,
  });
  const [p2pStatus, setP2pStatus] = useState<'connecting' | 'active' | 'inactive'>('connecting');
  const [connectedPeers, setConnectedPeers] = useState<string[]>([]);

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
          setError('HLS.js não é suportado neste navegador');
        }
      } catch (err) {
        setIsSupported(false);
        setError('Erro ao verificar suporte do navegador');
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
      
      // Destruir P2P engine primeiro para evitar problemas com ArrayBuffers
      try {
        if (hlsRef.current.p2pEngine) {
          const p2pEngine = hlsRef.current.p2pEngine;
          // Parar todas as operações P2P
          if (typeof p2pEngine.destroyCore === 'function') {
            p2pEngine.destroyCore();
          } else if (typeof p2pEngine.destroy === 'function') {
            p2pEngine.destroy();
          }
        }
      } catch (err) {
        // Ignorar erros durante cleanup do P2P
      }
      
      // Aguardar um pouco antes de destruir o HLS
      setTimeout(() => {
        try {
          if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
          }
        } catch (err) {
          // Ignorar erros
          hlsRef.current = null;
        }
      }, 50);
    }

    // Resetar estatísticas e peers
    setP2pStats({
      peers: 0,
      downloaded: 0,
      uploaded: 0,
    });
    setConnectedPeers([]);

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
      console.error('Erro ao injetar P2P no HLS:', err);
      setError('Erro ao inicializar P2P engine');
      setIsLoading(false);
      return;
    }

    // Criar instância do HLS com P2P
    const hls = new HlsWithP2P({
      p2p: {
        core: {
          swarmId: src, // Usar a URL como swarmId para agrupar peers do mesmo stream
          // Configurações adicionais para melhor performance
          loader: {
            // Configurar para permitir mais peers
            maxLoaderRetries: 3,
            loaderTimeout: 10000,
          },
        },
        onHlsJsCreated: (hlsInstance: any) => {
          setP2pStatus('connecting');
          
          // Aguardar um pouco para o engine estar totalmente inicializado
          setTimeout(() => {
            if (!hlsInstance.p2pEngine) {
              return;
            }

            const p2pEngine = hlsInstance.p2pEngine;
            const core = p2pEngine.core;

            // Função para obter estatísticas do core através dos loaders
            const getStatsFromCore = () => {
              try {
                if (!core) return null;

                let stats: any = {
                  peers: 0,
                  downloaded: 0,
                  uploaded: 0,
                };

                // Acessar através do mainStreamLoader com proteção contra ArrayBuffer detached
                try {
                  const mainLoader = core.mainStreamLoader;
                  if (mainLoader && !mainLoader._destroyed) {
                    if (mainLoader.stats && typeof mainLoader.stats === 'object') {
                      stats.downloaded += mainLoader.stats.totalP2PDownloaded || mainLoader.stats.totalHTTPDownloaded || mainLoader.stats.downloadedBytes || 0;
                      stats.uploaded += mainLoader.stats.totalP2PUploaded || mainLoader.stats.uploadedBytes || 0;
                    }
                    if (typeof mainLoader.getStats === 'function') {
                      try {
                        const loaderStats = mainLoader.getStats();
                        if (loaderStats && typeof loaderStats === 'object') {
                          stats.downloaded += loaderStats.totalP2PDownloaded || loaderStats.totalHTTPDownloaded || loaderStats.downloadedBytes || 0;
                          stats.uploaded += loaderStats.totalP2PUploaded || loaderStats.uploadedBytes || 0;
                        }
                      } catch (err) {
                        // Ignorar erros de ArrayBuffer detached
                      }
                    }
                    // Tentar propriedades diretas (números apenas)
                    if (typeof mainLoader.totalP2PDownloaded === 'number') {
                      stats.downloaded += mainLoader.totalP2PDownloaded;
                    }
                    if (typeof mainLoader.totalHTTPDownloaded === 'number') {
                      stats.downloaded += mainLoader.totalHTTPDownloaded;
                    }
                    if (typeof mainLoader.totalP2PUploaded === 'number') {
                      stats.uploaded += mainLoader.totalP2PUploaded;
                    }
                  }
                } catch (err) {
                  // Ignorar erro (pode ser ArrayBuffer detached)
                }

                // Acessar através do secondaryStreamLoader
                try {
                  const secondaryLoader = core.secondaryStreamLoader;
                  if (secondaryLoader && !secondaryLoader._destroyed) {
                    if (secondaryLoader.stats && typeof secondaryLoader.stats === 'object') {
                      stats.downloaded += secondaryLoader.stats.totalP2PDownloaded || secondaryLoader.stats.totalHTTPDownloaded || secondaryLoader.stats.downloadedBytes || 0;
                      stats.uploaded += secondaryLoader.stats.totalP2PUploaded || secondaryLoader.stats.uploadedBytes || 0;
                    }
                    if (typeof secondaryLoader.getStats === 'function') {
                      try {
                        const loaderStats = secondaryLoader.getStats();
                        if (loaderStats && typeof loaderStats === 'object') {
                          stats.downloaded += loaderStats.totalP2PDownloaded || loaderStats.totalHTTPDownloaded || loaderStats.downloadedBytes || 0;
                          stats.uploaded += loaderStats.totalP2PUploaded || loaderStats.uploadedBytes || 0;
                        }
                      } catch (err) {
                        // Ignorar erros
                      }
                    }
                    if (typeof secondaryLoader.totalP2PDownloaded === 'number') {
                      stats.downloaded += secondaryLoader.totalP2PDownloaded;
                    }
                    if (typeof secondaryLoader.totalHTTPDownloaded === 'number') {
                      stats.downloaded += secondaryLoader.totalHTTPDownloaded;
                    }
                    if (typeof secondaryLoader.totalP2PUploaded === 'number') {
                      stats.uploaded += secondaryLoader.totalP2PUploaded;
                    }
                  }
                } catch (err) {
                  // Ignorar erro
                }

                // Acessar através do segmentStorage
                try {
                  const segmentStorage = core.segmentStorage;
                  if (segmentStorage && !segmentStorage._destroyed) {
                    if (segmentStorage.stats && typeof segmentStorage.stats === 'object') {
                      stats.downloaded += segmentStorage.stats.totalP2PDownloaded || segmentStorage.stats.totalHTTPDownloaded || segmentStorage.stats.downloadedBytes || 0;
                      stats.uploaded += segmentStorage.stats.totalP2PUploaded || segmentStorage.stats.uploadedBytes || 0;
                    }
                    if (typeof segmentStorage.getStats === 'function') {
                      try {
                        const storageStats = segmentStorage.getStats();
                        if (storageStats && typeof storageStats === 'object') {
                          stats.downloaded += storageStats.totalP2PDownloaded || storageStats.totalHTTPDownloaded || storageStats.downloadedBytes || 0;
                          stats.uploaded += storageStats.totalP2PUploaded || storageStats.uploadedBytes || 0;
                        }
                      } catch (err) {
                        // Ignorar erros
                      }
                    }
                    if (typeof segmentStorage.totalP2PDownloaded === 'number') {
                      stats.downloaded += segmentStorage.totalP2PDownloaded;
                    }
                    if (typeof segmentStorage.totalHTTPDownloaded === 'number') {
                      stats.downloaded += segmentStorage.totalHTTPDownloaded;
                    }
                    if (typeof segmentStorage.totalP2PUploaded === 'number') {
                      stats.uploaded += segmentStorage.totalP2PUploaded;
                    }
                  }
                } catch (err) {
                  // Ignorar erro
                }

                return stats;
              } catch (err) {
                // Ignorar todos os erros (incluindo ArrayBuffer detached)
                return null;
              }
            };

            // Rastrear peers manualmente através dos eventos
            let trackedPeers = new Set<string>();
            
            // Função para atualizar lista de peers
            const updatePeerList = () => {
              setConnectedPeers(Array.from(trackedPeers));
            };

            // Atualizar estatísticas periodicamente
            const updateStats = () => {
              const stats = getStatsFromCore();
              
              if (stats) {
                // Usar peers rastreados
                stats.peers = trackedPeers.size;
                
                setP2pStats((prev) => {
                  // Atualizar sempre que houver mudanças
                  const hasChanges = 
                    stats.peers !== prev.peers ||
                    Math.abs(stats.downloaded - prev.downloaded) > 512 || // 512 bytes de diferença
                    Math.abs(stats.uploaded - prev.uploaded) > 512;

                  if (hasChanges) {
                    // Atualizar status do P2P baseado nas estatísticas
                    if (stats.peers > 0 || stats.downloaded > 0 || stats.uploaded > 0) {
                      setP2pStatus('active');
                    } else {
                      setP2pStatus('inactive');
                    }
                    return stats;
                  }
                  return prev;
                });
              } else {
                // Se não conseguir obter stats, usar apenas peers rastreados
                const peerCount = trackedPeers.size;
                if (peerCount > 0) {
                  setP2pStatus('active');
                  setP2pStats((prev) => ({
                    ...prev,
                    peers: peerCount,
                  }));
                } else {
                  setP2pStatus('inactive');
                }
              }
            };

            // Atualizar imediatamente
            updateStats();

            // Atualizar periodicamente a cada segundo
            statsIntervalRef.current = setInterval(updateStats, 1000);

            // Event listeners para conexão/desconexão de peers
            const handlePeerConnect = (params: any) => {
              const peerId = params.peerId || params;
              if (peerId) {
                trackedPeers.add(peerId);
                updatePeerList();
              }
              updateStats();
            };

            const handlePeerClose = (params: any) => {
              const peerId = params.peerId || params;
              if (peerId) {
                trackedPeers.delete(peerId);
                updatePeerList();
              }
              updateStats();
            };

            // Registrar eventos de peers
            if (typeof p2pEngine.on === 'function') {
              p2pEngine.on('peerConnect', handlePeerConnect);
              p2pEngine.on('peerClose', handlePeerClose);
              p2pEngine.on('stats', (stats: any) => {
                if (stats) {
                  setP2pStats((prev) => ({
                    peers: trackedPeers.size,
                    downloaded: stats.totalP2PDownloaded || stats.totalHTTPDownloaded || stats.downloadedBytes || prev.downloaded,
                    uploaded: stats.totalP2PUploaded || stats.uploadedBytes || prev.uploaded,
                  }));
                }
              });
            } else if (typeof p2pEngine.addEventListener === 'function') {
              p2pEngine.addEventListener('onPeerConnect', handlePeerConnect);
              p2pEngine.addEventListener('onPeerClose', handlePeerClose);
              p2pEngine.addEventListener('stats', (stats: any) => {
                if (stats) {
                  setP2pStats((prev) => ({
                    peers: trackedPeers.size,
                    downloaded: stats.totalP2PDownloaded || stats.totalHTTPDownloaded || stats.downloadedBytes || prev.downloaded,
                    uploaded: stats.totalP2PUploaded || stats.uploadedBytes || prev.uploaded,
                  }));
                }
              });
            }
          }, 500); // Aguardar 500ms para o engine inicializar
        },
      },
    });

    hlsRef.current = hls;

    // Event listeners do HLS
    const handleManifestParsed = () => {
      setIsLoading(false);
      if (autoPlay) {
        video.play().catch((err) => {
          console.error('Erro ao reproduzir automaticamente:', err);
        });
      }
    };

    const handleError = (event: any, data: any) => {
      // Erros não fatais comuns que podem ser ignorados silenciosamente
      const ignorableErrors = [
        'fragParsingError',
        'fragLoadError',
        'bufferAppendingError',
        'bufferStalledError',
      ];

      if (data.fatal) {
        console.error('Erro HLS FATAL:', data);
        // Usar valores numéricos ou strings para evitar problemas com tipos
        const errorType = data.type;
        if (errorType === 2 || errorType === 'networkError' || (Hls && errorType === Hls.ErrorTypes?.NETWORK_ERROR)) {
          console.error('Erro de rede fatal, tentando recuperar...');
          hls.startLoad();
        } else if (errorType === 3 || errorType === 'mediaError' || (Hls && errorType === Hls.ErrorTypes?.MEDIA_ERROR)) {
          console.error('Erro de mídia fatal, tentando recuperar...');
          hls.recoverMediaError();
        } else {
          console.error('Erro fatal não recuperável, destruindo instância...');
          hls.destroy();
          setIsLoading(false);
          setError(`Erro ao carregar o vídeo: ${data.details || 'Erro desconhecido'}`);
        }
      } else {
        // Erros não fatais - apenas logar se não for um erro comum/ignorável
        if (!ignorableErrors.includes(data.details)) {
          console.warn('Erro HLS não fatal:', data.details, data);
        }
        // Tentar recuperar automaticamente para alguns tipos de erro
        if (data.details === 'fragLoadError' || data.details === 'fragParsingError') {
          // Esses erros são comuns e o HLS.js geralmente se recupera automaticamente
          // Não precisamos fazer nada, apenas deixar o HLS.js lidar
        }
      }
    };

    // Usar valores de eventos do HLS
    const manifestParsedEvent = Hls?.Events?.MANIFEST_PARSED || 'hlsManifestParsed';
    const errorEvent = Hls?.Events?.ERROR || 'hlsError';
    
    hls.on(manifestParsedEvent, handleManifestParsed);
    hls.on(errorEvent, handleError);

    // Anexar o vídeo e carregar a fonte
    try {
      hls.attachMedia(video);
      hls.loadSource(src);
    } catch (err) {
      console.error('Erro ao anexar mídia ou carregar fonte:', err);
      setIsLoading(false);
      setError('Erro ao carregar o stream. Verifique se a URL é válida.');
    }

    // Cleanup
    return () => {
      // Limpar intervalo de estatísticas primeiro
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }

      // Flag para indicar que estamos fazendo cleanup
      let isCleaningUp = true;

      // Função de cleanup segura
      const safeCleanup = () => {
        if (!hlsRef.current || !isCleaningUp) return;

        try {
          // Parar o vídeo primeiro
          if (video) {
            try {
              video.pause();
              video.removeAttribute('src');
              video.load();
            } catch (err) {
              // Ignorar erros ao limpar vídeo
            }
          }

          const hlsInstance = hlsRef.current;

          // Destruir P2P engine ANTES de destruir o HLS
          if (hlsInstance.p2pEngine) {
            try {
              const p2pEngine = hlsInstance.p2pEngine;
              
              // Remover listeners primeiro
              if (typeof p2pEngine.off === 'function') {
                try {
                  p2pEngine.off('stats');
                  p2pEngine.off('peerConnect');
                  p2pEngine.off('peerClose');
                  p2pEngine.off('error');
                } catch (err) {
                  // Ignorar
                }
              }

              // Destruir o P2P engine
              if (typeof p2pEngine.destroyCore === 'function') {
                p2pEngine.destroyCore();
              } else if (typeof p2pEngine.destroy === 'function') {
                p2pEngine.destroy();
              }
            } catch (err) {
              // Ignorar erros durante cleanup do P2P engine
            }
          }

          // Aguardar um pouco antes de destruir o HLS para garantir que o P2P terminou
          setTimeout(() => {
            if (!hlsRef.current || !isCleaningUp) return;

            try {
              // Remover listeners do HLS
              const manifestParsedEvent = Hls?.Events?.MANIFEST_PARSED || 'hlsManifestParsed';
              const errorEvent = Hls?.Events?.ERROR || 'hlsError';
              
              if (hlsRef.current.off) {
                hlsRef.current.off(manifestParsedEvent, handleManifestParsed);
                hlsRef.current.off(errorEvent, handleError);
              }

              // Destruir instância HLS
              hlsRef.current.destroy();
            } catch (err) {
              // Ignorar erros ao destruir
            } finally {
              hlsRef.current = null;
              isCleaningUp = false;
            }
          }, 150);
        } catch (err) {
          // Ignorar todos os erros durante cleanup
          hlsRef.current = null;
          isCleaningUp = false;
        }
      };

      // Executar cleanup com delay para permitir que operações pendentes terminem
      setTimeout(safeCleanup, 50);
    };
  }, [src, autoPlay, isSupported]);

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
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white z-10 bg-black/70 px-8 py-4 rounded-lg">
          Carregando stream...
        </div>
      )}
      <video
        ref={videoRef}
        controls={controls}
        className="block w-full h-auto max-h-[80vh]"
      />
      <div className="p-4 bg-gray-900 border-t border-gray-700">
        <div className="flex gap-6 flex-wrap items-center mb-4">
          <div className="flex gap-2 items-center">
            <span className="text-gray-500 text-sm">Status P2P:</span>
            <span className={`font-semibold text-sm flex items-center gap-1 ${
              p2pStatus === 'active' ? 'text-green-500' : 
              p2pStatus === 'connecting' ? 'text-yellow-500' : 
              'text-gray-400'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                p2pStatus === 'active' ? 'bg-green-500 animate-pulse' : 
                p2pStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 
                'bg-gray-400'
              }`}></span>
              {p2pStatus === 'active' ? 'Ativo' : 
               p2pStatus === 'connecting' ? 'Conectando...' : 
               'Inativo'}
            </span>
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-gray-500 text-sm">Peers:</span>
            <span className="text-green-500 font-semibold text-sm">{p2pStats.peers}</span>
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-gray-500 text-sm">Downloaded:</span>
            <span className="text-green-500 font-semibold text-sm">
              {(p2pStats.downloaded / 1024 / 1024).toFixed(2)} MB
            </span>
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-gray-500 text-sm">Uploaded:</span>
            <span className="text-green-500 font-semibold text-sm">
              {(p2pStats.uploaded / 1024 / 1024).toFixed(2)} MB
            </span>
          </div>
        </div>
        {connectedPeers.length > 0 && (
          <PeerNetworkGraph peers={connectedPeers} />
        )}
      </div>
    </div>
  );
}
