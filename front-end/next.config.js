const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js 15 configurações
  reactStrictMode: true,
  output: 'standalone', // Para Docker
  
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.plugins.push(
        new NodePolyfillPlugin({
          additionalAliases: ['process'],
        })
      );
    }
    return config;
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
};

module.exports = nextConfig;
