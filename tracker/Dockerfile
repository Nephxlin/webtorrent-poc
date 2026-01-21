FROM ubuntu:24.04

# Instalar Node.js 22, Yarn e dependências
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    net-tools \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && corepack enable \
    && corepack prepare yarn@stable --activate \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar arquivos de dependências
COPY package.json yarn.lock ./

# Instalar dependências
RUN yarn install --frozen-lockfile

# Copiar código fonte e configuração
COPY . .

# Garantir que o config.json está no lugar certo
RUN test -f config.json || (echo "config.json não encontrado!" && exit 1)

# Verificar se o arquivo src/index.ts existe
RUN test -f src/index.ts || (echo "src/index.ts não encontrado!" && exit 1)

# Expor porta
EXPOSE 8000

# Comando para iniciar
CMD ["yarn", "start"]
