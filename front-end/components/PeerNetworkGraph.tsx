'use client';

import { useEffect, useRef, useState } from 'react';

interface PeerNetworkGraphProps {
  peers: string[];
  className?: string;
}

export default function PeerNetworkGraph({ peers, className = '' }: PeerNetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 300, height: 200 });

  useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width || 300, height: rect.height || 200 });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Calcular posições dos nós
  const calculateNodePositions = () => {
    const positions: Array<{ x: number; y: number; id: string }> = [];
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    const radius = Math.min(dimensions.width, dimensions.height) * 0.3;

    // Nó central (You)
    positions.push({ x: centerX, y: centerY, id: 'You' });

    // Outros peers em círculo ao redor
    const peerCount = peers.length;
    peers.forEach((peerId, index) => {
      const angle = (2 * Math.PI * index) / peerCount;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      positions.push({ x, y, id: peerId });
    });

    return positions;
  };

  const nodePositions = calculateNodePositions();
  const centerNode = nodePositions[0];
  const peerNodes = nodePositions.slice(1);

  return (
    <div className={`w-full ${className}`}>
      <div className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-white text-sm font-semibold mb-3">Rede P2P</h3>
        <svg
          ref={svgRef}
          width="100%"
          height="200"
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          className="w-full"
          style={{ minHeight: '200px' }}
        >
          {/* Linhas de conexão */}
          {peerNodes.map((peer) => (
            <line
              key={`line-${peer.id}`}
              x1={centerNode.x}
              y1={centerNode.y}
              x2={peer.x}
              y2={peer.y}
              stroke="#4B5563"
              strokeWidth="2"
              opacity="0.5"
            />
          ))}

          {/* Nó central (You) */}
          <g>
            <circle
              cx={centerNode.x}
              cy={centerNode.y}
              r="20"
              fill="#3B82F6"
              stroke="#1E40AF"
              strokeWidth="2"
            />
            <text
              x={centerNode.x}
              y={centerNode.y + 5}
              textAnchor="middle"
              fill="white"
              fontSize="10"
              fontWeight="600"
            >
              You
            </text>
          </g>

          {/* Nós dos peers */}
          {peerNodes.map((peer, index) => (
            <g key={`peer-${peer.id}`}>
              <circle
                cx={peer.x}
                cy={peer.y}
                r="15"
                fill="#FCD34D"
                stroke="#F59E0B"
                strokeWidth="2"
              />
              <text
                x={peer.x}
                y={peer.y - 25}
                textAnchor="middle"
                fill="#9CA3AF"
                fontSize="8"
                className="font-mono"
              >
                {peer.id.substring(0, 8)}...
              </text>
            </g>
          ))}
        </svg>
        <div className="mt-3 text-center">
          <span className="text-gray-400 text-xs">
            {peers.length} {peers.length === 1 ? 'peer conectado' : 'peers conectados'}
          </span>
        </div>
      </div>
    </div>
  );
}
