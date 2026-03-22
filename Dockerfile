FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 5000

# ; au lieu de && : le serveur démarre même si le seed échoue
CMD ["sh", "-c", "node seed.js; node server.js"]
