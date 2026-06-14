# Imagem do backend/frontend (Express serve a API + os estáticos de public/,
# incluindo o backoffice em /backoffice).
FROM node:20-alpine

WORKDIR /app

# Instala dependências primeiro (camada cacheável).
COPY package*.json ./
RUN npm ci --omit=dev

# Copia o restante do código.
COPY . .

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "start"]
