FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 5000

# Seed la BDD puis démarre le serveur
CMD ["sh", "-c", "node seed.js && node server.js"]
