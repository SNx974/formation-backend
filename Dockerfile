FROM node:20-alpine

WORKDIR /app

# Ajoute bash pour compatibilité Dokploy
RUN apk add --no-cache bash

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 5000

CMD ["sh", "-c", "node seed.js; node server.js"]
