FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
ENV PORT=8787 WHATSAPP_AUTH_DIR=/data/whatsapp-auth
VOLUME ["/data"]
EXPOSE 8787
CMD ["node", "src/server.js"]