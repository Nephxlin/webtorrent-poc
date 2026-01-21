'use client';

import { useEffect, useRef, useState } from 'react';

interface PeerNetworkGraphProps {
  peers: string[];
  className?: string;
}

export default function PeerNetworkGraph({ peers, className = '' }: PeerNetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 280 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const width = Math.max(400, rect.width || 400);
        setDimensions({ 
          width, 
          height: 280 
        });
      }
    };

    // Aguardar um pouco para garantir que o DOM está pronto
    const timeout = setTimeout(updateDimensions, 100);
    updateDimensions();
    
    window.addEventListener('resize', updateDimensions);
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  // Calcular posições dos nós
  const calculateNodePositions = () => {
    const positions: Array<{ x: number; y: number; id: string }> = [];
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    const radius = Math.min(dimensions.width, dimensions.height) * 0.35;

    // Nó central (You)
    positions.push({ x: centerX, y: centerY, id: 'You' });

    // Outros peers em círculo ao redor
    const peerCount = peers.length;
    if (peerCount > 0) {
      peers.forEach((peerId, index) => {
        // Distribuir peers uniformemente em círculo
        const angle = peerCount === 1 
          ? Math.PI / 2 // Se houver apenas 1 peer, colocar no topo
          : (2 * Math.PI * index) / peerCount;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        positions.push({ x, y, id: peerId });
      });
    }

    return positions;
  };

  // Recalcular posições quando dimensões ou peers mudarem
  const nodePositions = calculateNodePositions();
  const centerNode = nodePositions[0] || { x: dimensions.width / 2, y: dimensions.height / 2, id: 'You' };
  const peerNodes = nodePositions.slice(1);

  return (
    <div ref={containerRef} className={`w-full ${className}`}>
      <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 rounded-2xl p-8 border border-gray-700/40 hover:border-blue-500/60 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/20">
        <svg
          ref={svgRef}
          width="100%"
          height="280"
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          preserveAspectRatio="xMidYMid meet"
          className="w-full"
          style={{ display: 'block' }}
        >
          {/* Gradientes */}
          <defs>
            <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="50%" stopColor="#8B5CF6" />
              <stop offset="100%" stopColor="#FCD34D" />
            </linearGradient>
            <radialGradient id="centerGradient">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="100%" stopColor="#3B82F6" />
            </radialGradient>
            <radialGradient id="peerGradient">
              <stop offset="0%" stopColor="#FDE047" />
              <stop offset="100%" stopColor="#FCD34D" />
            </radialGradient>
          </defs>

          {/* Linhas de conexão - renderizar primeiro para ficar atrás dos nós */}
          {peerNodes.length > 0 && peerNodes.map((peer) => {
            // Verificar se as coordenadas são válidas
            if (!centerNode || !peer || isNaN(centerNode.x) || isNaN(centerNode.y) || isNaN(peer.x) || isNaN(peer.y)) {
              return null;
            }
            return (
              <line
                key={`line-${peer.id}`}
                x1={centerNode.x}
                y1={centerNode.y}
                x2={peer.x}
                y2={peer.y}
                stroke="#6366F1"
                strokeWidth="3"
                opacity="0.7"
                strokeLinecap="round"
                strokeDasharray="0"
              />
            );
          })}

          {/* Nó central (You) */}
          <g>
            <circle
              cx={centerNode.x}
              cy={centerNode.y}
              r="26"
              fill="url(#centerGradient)"
              stroke="#1E40AF"
              strokeWidth="3"
              className="drop-shadow-2xl"
            />
            <text
              x={centerNode.x}
              y={centerNode.y + 7}
              textAnchor="middle"
              fill="white"
              fontSize="13"
              fontWeight="800"
              className="drop-shadow-lg"
            >
              You
            </text>
          </g>

          {/* Nós dos peers */}
          {peerNodes.map((peer) => (
            <g key={`peer-${peer.id}`}>
              <circle
                cx={peer.x}
                cy={peer.y}
                r="18"
                fill="url(#peerGradient)"
                stroke="#F59E0B"
                strokeWidth="2.5"
                className="drop-shadow-xl"
              />
              <text
                x={peer.x}
                y={peer.y - 32}
                textAnchor="middle"
                fill="#E5E7EB"
                fontSize="10"
                fontWeight="600"
                className="font-mono drop-shadow-md"
              >
                {peer.id.substring(0, 8)}...
              </text>
            </g>
          ))}

          {/* Mensagem quando não há peers */}
          {peers.length === 0 && (
            <g>
              <text
                x={centerNode.x}
                y={centerNode.y + 60}
                textAnchor="middle"
                fill="#9CA3AF"
                fontSize="15"
                fontWeight="600"
              >
                Aguardando conexões P2P...
              </text>
              <text
                x={centerNode.x}
                y={centerNode.y + 85}
                textAnchor="middle"
                fill="#6B7280"
                fontSize="12"
              >
                Os peers aparecerão aqui quando conectarem
              </text>
            </g>
          )}
        </svg>
        <div className="mt-6 text-center">
          <span className="text-gray-300 text-base font-semibold px-4 py-2 bg-gray-800/50 rounded-xl border border-gray-700/50 inline-block">
            {peers.length === 0 
              ? 'Nenhum peer conectado' 
              : `${peers.length} ${peers.length === 1 ? 'peer conectado' : 'peers conectados'}`
            }
          </span>
        </div>
      </div>
    </div>
  );
}
