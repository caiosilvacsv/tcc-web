# syntax=docker/dockerfile:1
# ==============================================================================
# Dockerfile Multiestágio para o Frontend (tcc-web)
# Plataforma: Node.js 20 (Build) & Nginx Alpine (Runtime Estático + Proxy)
# ==============================================================================

# --- Estágio 1: Build da SPA React com Node.js ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copia manifesto de dependências e instala usando Cache Mount sem auditoria lenta
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

# Copia o código-fonte e compila para a pasta /app/dist
COPY . .
RUN npm run build

# --- Estágio 2: Servidor Web Nginx de Produção de Alta Performance ---
FROM nginx:alpine

# Remove a configuração padrão do Nginx
RUN rm -rf /etc/nginx/conf.d/*

# Copia a configuração personalizada do Nginx (SPA + Proxy Reverso da API)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia os artefatos estáticos compilados do React
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
