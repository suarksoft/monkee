FROM node:20-alpine

WORKDIR /app

COPY monadbot/package*.json ./
RUN npm ci --only=production=false

COPY monadbot/prisma ./prisma
RUN npx prisma generate

COPY monadbot/tsconfig.json ./
COPY monadbot/src ./src
RUN npm run build

CMD ["node", "dist/index.js"]
