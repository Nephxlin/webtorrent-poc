FROM node:20-slim

# Instalar FFmpeg e dependências necessárias
RUN apt-get update && apt-get install -y \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar arquivos de dependências
COPY package.json yarn.lock ./

# Instalar dependências
RUN yarn install --frozen-lockfile

# Copiar código fonte
COPY . .

# Criar diretórios necessários
RUN mkdir -p uploads videos conversions

# Build do TypeScript
RUN yarn build

# Expor porta
EXPOSE 3001

# Comando para iniciar
CMD ["yarn", "start"]
