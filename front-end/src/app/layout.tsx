import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'P2P Video Player',
  description: 'Player de vídeo P2P usando p2p-media-loader',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
