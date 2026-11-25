FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY . .
EXPOSE 5173
CMD ["node", "server.mjs"]
