'use client';

import { useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface Video {
  id: string;
  originalName: string;
  fileName: string;
  m3u8Url: string;
  createdAt: string;
  size?: number;
}

interface VideoListProps {
  onSelectVideo: (m3u8Url: string, videoName: string) => void;
  selectedVideoUrl?: string;
}

export default function VideoList({ onSelectVideo, selectedVideoUrl }: VideoListProps) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_URL}/api/videos`);
      if (!response.ok) {
        throw new Error('Erro ao carregar vídeos');
      }
      const data = await response.json();
      setVideos(data.videos || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar vídeos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
    // Atualizar lista a cada 5 segundos
    const interval = setInterval(fetchVideos, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleDelete = async (videoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Tem certeza que deseja deletar este vídeo?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/videos/${videoId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Erro ao deletar vídeo');
      }

      // Atualizar lista
      fetchVideos();
    } catch (err: any) {
      alert('Erro ao deletar vídeo: ' + (err.message || 'Erro desconhecido'));
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading && videos.length === 0) {
    return (
      <div className="bg-gradient-to-br from-gray-800/95 to-gray-900/95 backdrop-blur-sm p-8 rounded-2xl border border-gray-700/60 shadow-2xl">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-3"></div>
          <p className="text-gray-300 font-medium">Carregando vídeos...</p>
        </div>
      </div>
    );
  }

  if (error && videos.length === 0) {
    return (
      <div className="bg-gradient-to-br from-gray-800/95 to-gray-900/95 backdrop-blur-sm p-8 rounded-2xl border border-red-500/30 shadow-2xl">
        <div className="text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="mb-2 text-red-400 font-semibold">Erro ao carregar vídeos</p>
          <p className="text-sm text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchVideos}
            className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all shadow-lg hover:shadow-xl font-medium"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-800/95 to-gray-900/95 backdrop-blur-sm rounded-2xl border border-gray-700/60 shadow-2xl overflow-hidden">
      <div className="p-6 border-b border-gray-700/60 bg-gradient-to-r from-gray-800/50 to-gray-900/50 flex items-center justify-between">
        <h2 className="text-white text-xl font-bold flex items-center gap-3">
          <span className="w-1.5 h-7 bg-gradient-to-b from-blue-500 via-purple-500 to-pink-500 rounded-full"></span>
          <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Biblioteca de Vídeos
          </span>
        </h2>
        <button
          onClick={fetchVideos}
          className="px-4 py-2 text-sm bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 text-white rounded-xl transition-all shadow-md hover:shadow-lg"
          title="Atualizar lista"
        >
          🔄 Atualizar
        </button>
      </div>

      {videos.length === 0 ? (
        <div className="p-10 text-center">
          <div className="text-5xl mb-4 opacity-50">📹</div>
          <p className="text-gray-300 font-medium mb-2">Nenhum vídeo encontrado</p>
          <p className="text-sm text-gray-500">Faça upload de um vídeo para começar</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-700/40 max-h-[600px] overflow-y-auto custom-scrollbar">
          {videos.map((video) => {
            const fullUrl = `${API_URL}${video.m3u8Url}`;
            const isSelected = selectedVideoUrl === fullUrl;

            return (
              <div
                key={video.id}
                onClick={() => onSelectVideo(fullUrl, video.originalName)}
                className={`p-5 cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? 'bg-gradient-to-r from-green-500/20 via-blue-500/10 to-purple-500/10 border-l-4 border-green-400 shadow-lg'
                    : 'hover:bg-gradient-to-r hover:from-gray-700/30 hover:to-gray-800/30'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">🎬</span>
                      <h3 className={`font-semibold truncate ${
                        isSelected ? 'text-green-300' : 'text-white'
                      }`}>
                        {video.originalName}
                      </h3>
                    </div>
                    <p className="text-xs text-gray-400 flex items-center gap-1.5 mb-2">
                      <span>📅</span>
                      {formatDate(video.createdAt)}
                    </p>
                    {isSelected && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gradient-to-r from-green-500/30 to-blue-500/30 text-green-300 rounded-lg border border-green-500/30 font-medium">
                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                        Reproduzindo
                      </span>
                    )}
                  </div>
                  <button
                    onClick={(e) => handleDelete(video.id, e)}
                    className="px-3 py-2 text-sm bg-gradient-to-r from-red-500/20 to-red-600/20 hover:from-red-500/30 hover:to-red-600/30 text-red-400 rounded-xl transition-all shadow-md hover:shadow-lg flex-shrink-0 border border-red-500/20"
                    title="Deletar vídeo"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
