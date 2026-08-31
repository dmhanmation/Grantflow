FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx vite build
RUN mkdir -p /app/data
EXPOSE 8080
ENV PORT=8080
ENV NODE_ENV=production
CMD ["npx", "tsx", "server.ts"]
