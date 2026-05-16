FROM node:20-slim

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY monadbot/package*.json ./
RUN npm ci

COPY monadbot/prisma ./prisma
RUN npx prisma generate

COPY monadbot/tsconfig.json ./
COPY monadbot/src ./src
RUN npm run build

CMD ["node", "dist/index.js"]
