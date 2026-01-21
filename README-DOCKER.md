# 🐳 Docker Setup - P2P Video Player

Este projeto inclui configuração Docker completa para facilitar o desenvolvimento e testes.

## 📋 Pré-requisitos

- Docker Desktop ou Docker Engine instalado
- Docker Compose v2.0+

## 🚀 Como Usar

### 1. Subir todos os serviços

```bash
docker-compose up -d
```

### 2. Ver logs de todos os serviços

```bash
docker-compose logs -f
```

### 3. Ver logs de um serviço específico

```bash
docker-compose logs -f frontend
docker-compose logs -f backend
docker-compose logs -f tracker
```

### 4. Parar todos os serviços

```bash
docker-compose down
```

### 5. Parar e remover volumes (limpar dados)

```bash
docker-compose down -v
```

### 6. Reconstruir imagens

```bash
docker-compose build --no-cache
```

### 7. Reiniciar um serviço específico

```bash
docker-compose restart frontend
```

## 🌐 Acessos

Após subir os serviços, você pode acessar:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Tracker WebSocket**: ws://localhost:8000

## 📁 Volumes

Os seguintes diretórios são persistidos como volumes:

- `./back-end/uploads` - Vídeos enviados
- `./back-end/videos` - Vídeos convertidos (HLS)
- `./back-end/conversions` - Status de conversões

## 🔧 Variáveis de Ambiente

As variáveis de ambiente podem ser configuradas no `docker-compose.yml`:

### Frontend
- `NEXT_PUBLIC_API_URL` - URL da API backend
- `NEXT_PUBLIC_TRACKER_URL` - URL do tracker WebSocket

### Backend
- `PORT` - Porta do servidor (padrão: 3001)
- `FRONTEND_URL` - URL do frontend para CORS

## 🏗️ Estrutura dos Serviços

### Tracker (Porta 8000)
- Serviço WebTorrent tracker para descoberta de peers
- Baseado em `wt-tracker`
- Configuração em `tracker/config.json`

### Backend (Porta 3001)
- API REST para upload e gerenciamento de vídeos
- Conversão de vídeos para HLS usando FFmpeg
- WebSocket para estatísticas P2P agregadas
- Requer FFmpeg instalado (incluído na imagem Docker)

### Frontend (Porta 3000)
- Aplicação Next.js 15
- Player de vídeo P2P
- Interface de upload e gerenciamento

## 🐛 Troubleshooting

### Porta já em uso

Se alguma porta estiver em uso, você pode alterar no `docker-compose.yml`:

```yaml
ports:
  - "3000:3000"  # Altere a primeira porta (host)
```

### Rebuild completo

Se houver problemas, faça um rebuild completo:

```bash
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

### Verificar status dos serviços

```bash
docker-compose ps
```

### Acessar shell de um container

```bash
docker-compose exec frontend sh
docker-compose exec backend sh
docker-compose exec tracker sh
```

## 📝 Notas

- O tracker precisa estar rodando antes do frontend conectar
- O backend precisa do tracker para funcionar corretamente
- Os volumes são mapeados para o sistema de arquivos local para persistência
- As imagens são otimizadas para produção
