FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

FROM base AS development
CMD ["npm", "run", "dev"]

FROM base AS production
RUN npm run build && npm prune --omit=dev
CMD ["node", "dist/server.js"]
