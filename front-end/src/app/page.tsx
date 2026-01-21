'use client';

import { useState } from 'react';
import P2PVideoPlayer from '@/src/components/P2PVideoPlayer';
import VideoList from '@/src/components/VideoList';
import VideoUpload from '@/src/components/VideoUpload';
import GlobalCDNSavings from '@/src/components/GlobalCDNSavings';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function Home() {
  const [streamUrl, setStreamUrl] = useState(
    'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8'
  );
  const [customUrl, setCustomUrl] = useState('');
  const [selectedVideoName, setSelectedVideoName] = useState<string>('');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleLoadStream = () => {
    const url = customUrl.trim();
    if (url) {
      setStreamUrl(url);
      setSelectedVideoName('');
      setCustomUrl('');
    } else {
      alert('Por favor, insira uma URL válida');
    }
  };

  const handleSelectVideo = (m3u8Url: string, videoName: string) => {
    setStreamUrl(m3u8Url);
    setSelectedVideoName(videoName);
    setCustomUrl('');
  };

  const handleUploadSuccess = () => {
    // Forçar atualização da lista de vídeos
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-4 md:p-8 flex flex-col items-center gap-6 md:gap-8">
      <div className="w-full max-w-7xl flex flex-col gap-6 md:gap-8">
        {/* Header */}
        <header className="text-center mb-2">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-3 bg-gradient-to-r from-green-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
            P2P Video Player
          </h1>
          <p className="text-gray-400 text-base md:text-lg">
            Player de vídeo com tecnologia P2P usando p2p-media-loader
          </p>
        </header>

        {/* Economia Global de CDN */}
        <GlobalCDNSavings />

        {/* Layout Principal: Player à esquerda, Biblioteca à direita */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Coluna Esquerda: Player (ocupa 3 colunas) */}
          <div className="lg:col-span-3 space-y-6">
            {/* Player */}
            <div className="bg-gradient-to-br from-gray-800/95 to-gray-900/95 backdrop-blur-sm rounded-3xl border border-gray-700/60 shadow-2xl overflow-hidden">
              <P2PVideoPlayer key={streamUrl} src={streamUrl} />
            </div>

            {/* Vídeo Selecionado */}
            {selectedVideoName && (
              <div className="bg-gradient-to-r from-blue-500/20 via-blue-600/20 to-purple-500/20 border border-blue-500/50 rounded-2xl p-5 backdrop-blur-sm shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-pulse shadow-lg shadow-blue-400/50"></div>
                  <span className="text-blue-300 font-semibold">Reproduzindo:</span>
                  <span className="text-blue-100 font-bold">{selectedVideoName}</span>
                </div>
              </div>
            )}

            {/* Input de URL Externa */}
            <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm p-8 rounded-3xl border border-gray-700/60 shadow-2xl">
              <label
                htmlFor="stream-url"
                className="block text-base font-bold text-gray-200 mb-4 flex items-center gap-3"
              >
                <span className="text-xl">🔗</span>
                <span className="bg-gradient-to-r from-green-300 to-blue-300 bg-clip-text text-transparent">
                  URL Externa do Stream HLS (.m3u8)
                </span>
              </label>
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  id="stream-url"
                  type="text"
                  value={customUrl}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomUrl(e.target.value)}
                  placeholder="https://exemplo.com/video.m3u8"
                  className="flex-1 px-6 py-4 bg-gray-900/80 border border-gray-600/50 rounded-2xl text-white text-base focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 transition-all placeholder:text-gray-500 shadow-inner"
                  onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === 'Enter') {
                      handleLoadStream();
                    }
                  }}
                />
                <button
                  onClick={handleLoadStream}
                  className="px-10 py-4 bg-gradient-to-r from-green-500 via-green-600 to-green-500 text-white border-none rounded-2xl cursor-pointer text-base font-bold transition-all hover:from-green-600 hover:via-green-700 hover:to-green-600 active:scale-95 shadow-xl hover:shadow-2xl hover:shadow-green-500/40"
                >
                  Carregar
                </button>
              </div>
              <p className="text-sm text-gray-400 mt-4 flex items-center gap-2">
                <span>💡</span>
                <span>Exemplo: https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8</span>
              </p>
            </div>
          </div>

          {/* Coluna Direita: Biblioteca e Upload (ocupa 2 colunas) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Lista de Vídeos */}
            <div key={refreshKey}>
              <VideoList
                onSelectVideo={handleSelectVideo}
                selectedVideoUrl={streamUrl.startsWith(API_URL) ? streamUrl : undefined}
              />
            </div>

            {/* Upload de Vídeo */}
            <VideoUpload onUploadSuccess={handleUploadSuccess} />

            {/* Informação sobre Teste P2P */}
            <div className="bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 backdrop-blur-sm rounded-2xl border border-blue-500/30 shadow-xl overflow-hidden">
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div className="text-3xl flex-shrink-0">🌐</div>
                  <div className="flex-1">
                    <h3 className="text-white font-bold text-base mb-2 flex items-center gap-2">
                      <span className="w-1 h-5 bg-gradient-to-b from-blue-400 to-purple-400 rounded-full"></span>
                      <span className="bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent">
                        Teste a Rede P2P
                      </span>
                    </h3>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      Para testar a funcionalidade P2P e ver a economia de CDN em ação,{' '}
                      <span className="font-semibold text-blue-300">abra este mesmo vídeo em outras abas do navegador</span>.
                      Quanto mais abas abertas, maior será a economia de CDN através do compartilhamento P2P entre os peers.
                    </p>
                    <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <p className="text-gray-300 text-xs leading-relaxed">
                        <span className="font-semibold text-blue-300">💡 Importante:</span> Se você fizer upload de um novo vídeo,{' '}
                        <span className="font-semibold text-purple-300">certifique-se de abrir o mesmo vídeo em todas as outras abas</span>{' '}
                        para que o P2P funcione corretamente. Cada vídeo forma sua própria rede P2P independente.
                      </p>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                        <span>Peers conectados aparecem no gráfico</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Informações */}
        <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm p-8 rounded-3xl border border-gray-700/50 shadow-2xl text-base text-gray-300 leading-relaxed">
          <h2 className="mb-6 text-white text-2xl font-bold flex items-center gap-3">
            <span className="w-1.5 h-8 bg-gradient-to-b from-green-500 via-blue-500 to-purple-500 rounded-full shadow-lg shadow-green-500/30"></span>
            <span className="bg-gradient-to-r from-green-300 via-blue-300 to-purple-300 bg-clip-text text-transparent">
              Sobre o P2P Video Player
            </span>
          </h2>
          <ul className="list-none p-0 space-y-4">
            <li className="flex items-center gap-4">
              <span className="text-green-400 text-xl">✓</span>
              <span className="text-lg">Reduz custos de CDN em até 90%</span>
            </li>
            <li className="flex items-center gap-4">
              <span className="text-green-400 text-xl">✓</span>
              <span className="text-lg">Aumenta largura de banda e estabilidade</span>
            </li>
            <li className="flex items-center gap-4">
              <span className="text-green-400 text-xl">✓</span>
              <span className="text-lg">Melhora a qualidade de streaming</span>
            </li>
            <li className="flex items-center gap-4">
              <span className="text-green-400 text-xl">✓</span>
              <span className="text-lg">Suporta streams ao vivo e VOD (Video On Demand)</span>
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
