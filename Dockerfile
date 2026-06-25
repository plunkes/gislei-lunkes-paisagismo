# Imagem única: o backend (Express) serve a API + os estáticos do frontend/
# (incluindo o backoffice em /backoffice) + as imagens enviadas em /uploads.
#
# Contexto de build = raiz do repositório (backend/ e frontend/ são irmãos).
FROM node:20-alpine

WORKDIR /app

# Instala dependências do backend primeiro (camada cacheável).
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev

# Copia o código do backend, o frontend estático e os Termos de Uso.
COPY backend ./backend
COPY frontend ./frontend
COPY TERMOS_DE_USO.md ./TERMOS_DE_USO.md

ENV NODE_ENV=production
EXPOSE 3000

# server.js resolve os caminhos a partir de backend/src (sobe 2 níveis até /app).
WORKDIR /app/backend
CMD ["npm", "start"]
