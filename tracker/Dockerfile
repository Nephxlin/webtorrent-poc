FROM node:20-slim

WORKDIR /app

# Copiar arquivos de dependências
COPY package.json yarn.lock ./

# Instalar dependências
RUN yarn install --frozen-lockfile

# Copiar código fonte e configuração
COPY . .

# Expor porta
EXPOSE 8000

# Comando para iniciar
CMD ["yarn", "start"]
