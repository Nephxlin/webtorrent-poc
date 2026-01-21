# P2P Video Player - Next.js

Player de vídeo P2P usando Next.js, TypeScript e p2p-media-loader.

## 🚀 Funcionalidades

- ✅ Player de vídeo HLS com suporte P2P
- ✅ Estatísticas em tempo real (peers, download, upload)
- ✅ Interface moderna e responsiva
- ✅ Suporte para streams ao vivo e VOD
- ✅ Configuração de URL de stream personalizada

## 📦 Instalação

1. Instale as dependências:

```bash
npm install
```

2. Execute o servidor de desenvolvimento:

```bash
npm run dev
```

3. Abra [http://localhost:3000](http://localhost:3000) no seu navegador.

## 🎬 Como Usar

1. A página inicial já vem com um stream de exemplo carregado
2. Para carregar seu próprio stream, cole a URL do arquivo `.m3u8` no campo de texto
3. Clique em "Carregar" para iniciar a reprodução
4. As estatísticas P2P aparecerão abaixo do player mostrando:
   - Número de peers conectados
   - Dados baixados (MB)
   - Dados enviados (MB)

## 🔧 Tecnologias Utilizadas

- **Next.js 15** - Framework React (última versão)
- **React 19** - Biblioteca UI
- **TypeScript** - Tipagem estática
- **Tailwind CSS 4** - Framework CSS utility-first
- **HLS.js** - Player HLS
- **p2p-media-loader-hlsjs** - Engine P2P para HLS.js
- **node-polyfill-webpack-plugin** - Polyfills para Node.js no browser

## 📚 Documentação

Baseado na documentação oficial: [Setting up P2P Video on a Web Page](https://novage.com.ua/blog/setting-up-p2p-video-on-a-web-page-in-5-minutes-for-free)

## 🎯 Benefícios do P2P

- **Redução de custos**: Até 90% de redução nos custos de CDN
- **Maior largura de banda**: Cada peer contribui com upload
- **Melhor estabilidade**: Streaming mais resistente a picos de demanda
- **Escalabilidade**: Suporta milhões de peers com trackers personalizados

## 📝 Notas

- O player usa trackers públicos do WebTorrent para conectar peers
- Para cargas maiores (1000+ peers), recomenda-se usar trackers personalizados
- O swarmId é gerado automaticamente baseado na URL do stream
