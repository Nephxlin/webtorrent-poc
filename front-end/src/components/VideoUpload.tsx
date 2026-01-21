'use client';

import { useState, useRef } from 'react';
import ConversionStatus from './ConversionStatus';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface VideoUploadProps {
  onUploadSuccess: () => void;
}

export default function VideoUpload({ onUploadSuccess }: VideoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [convertingVideoId, setConvertingVideoId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    const allowedTypes = [
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'video/webm',
      'video/x-matroska',
    ];

    if (!allowedTypes.includes(file.type)) {
      setError('Tipo de arquivo não suportado. Use MP4, MOV, AVI, WEBM ou MKV.');
      return;
    }

    // Validar tamanho (máximo 2GB)
    const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
    if (file.size > maxSize) {
      setError('Arquivo muito grande. Tamanho máximo: 2GB');
      return;
    }

    await uploadVideo(file);
  };

  const uploadVideo = async (file: File) => {
    try {
      setUploading(true);
      setProgress(0);
      setError(null);
      setSuccess(null);

      const formData = new FormData();
      formData.append('video', file);

      // Usar XMLHttpRequest para ter progresso de upload
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setProgress(percentComplete);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          setSuccess(`Vídeo "${response.video.originalName}" enviado com sucesso!`);
          setProgress(100);
          setConvertingVideoId(response.video.id);
          
          // Limpar input
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }

          // Notificar componente pai após um delay
          setTimeout(() => {
            setUploading(false);
            setProgress(0);
          }, 1000);
        } else {
          const error = JSON.parse(xhr.responseText);
          throw new Error(error.message || 'Erro ao fazer upload');
        }
      });

      xhr.addEventListener('error', () => {
        setError('Erro de conexão ao fazer upload');
        setUploading(false);
        setProgress(0);
      });

      xhr.addEventListener('abort', () => {
        setError('Upload cancelado');
        setUploading(false);
        setProgress(0);
      });

      xhr.open('POST', `${API_URL}/api/upload`);
      xhr.send(formData);
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer upload do vídeo');
      setUploading(false);
      setProgress(0);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const file = e.dataTransfer.files?.[0];
    if (file) {
      uploadVideo(file);
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-800/95 to-gray-900/95 backdrop-blur-sm rounded-2xl border border-gray-700/60 shadow-2xl overflow-hidden">
      <div className="p-6 border-b border-gray-700/60 bg-gradient-to-r from-gray-800/50 to-gray-900/50">
        <h2 className="text-white text-xl font-bold flex items-center gap-3">
          <span className="w-1.5 h-7 bg-gradient-to-b from-green-500 via-blue-500 to-purple-500 rounded-full"></span>
          <span className="bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
            Upload de Vídeo
          </span>
        </h2>
      </div>

      <div className="p-6">
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-300 ${
            uploading
              ? 'border-green-400 bg-gradient-to-br from-green-500/20 to-blue-500/10 shadow-lg shadow-green-500/20'
              : 'border-gray-600 hover:border-gray-500 bg-gradient-to-br from-gray-900/60 to-gray-800/40 hover:from-gray-800/60 hover:to-gray-700/40'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/x-msvideo,video/webm,video/x-matroska"
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
            id="video-upload-input"
          />

          {uploading ? (
            <div className="space-y-5">
              <div className="text-6xl animate-bounce">⏳</div>
              <div>
                <p className="text-white font-bold text-lg mb-3">Enviando e convertendo vídeo...</p>
                <div className="w-full bg-gray-700/50 rounded-full h-3 mb-3 overflow-hidden shadow-inner">
                  <div
                    className="bg-gradient-to-r from-green-500 via-green-400 to-green-500 h-3 rounded-full transition-all duration-300 shadow-lg"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="text-lg font-semibold text-green-400 mb-2">{Math.round(progress)}%</p>
                <p className="text-xs text-gray-400">
                  ⏱️ Isso pode levar alguns minutos dependendo do tamanho do vídeo...
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="text-6xl opacity-70">📹</div>
              <div>
                <label
                  htmlFor="video-upload-input"
                  className="cursor-pointer inline-block px-8 py-4 bg-gradient-to-r from-green-500 via-green-600 to-green-500 text-white rounded-xl font-bold text-sm hover:from-green-600 hover:via-green-700 hover:to-green-600 transition-all shadow-xl hover:shadow-2xl hover:shadow-green-500/30 transform hover:scale-105"
                >
                  Selecionar Vídeo
                </label>
                <p className="text-gray-300 text-sm mt-4 font-medium">
                  ou arraste e solte o arquivo aqui
                </p>
                <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gray-800/50 rounded-lg border border-gray-700/50">
                  <span className="text-xs text-gray-400">
                    📦 Formatos: MP4, MOV, AVI, WEBM, MKV
                  </span>
                  <span className="text-xs text-gray-500">•</span>
                  <span className="text-xs text-gray-400">
                    💾 Máx. 2GB
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-5 p-4 bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/50 rounded-xl text-red-300 text-sm shadow-lg">
            <div className="flex items-center gap-2">
              <span className="text-lg">❌</span>
              <span className="font-medium">{error}</span>
            </div>
          </div>
        )}

        {success && !convertingVideoId && (
          <div className="mt-5 p-4 bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-500/50 rounded-xl text-green-300 text-sm shadow-lg">
            <div className="flex items-center gap-2">
              <span className="text-lg">✅</span>
              <span className="font-medium">{success}</span>
            </div>
          </div>
        )}

        {convertingVideoId && (
          <div className="mt-5">
            <ConversionStatus
              videoId={convertingVideoId}
              onComplete={() => {
                setConvertingVideoId(null);
                setSuccess(null);
                onUploadSuccess();
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
