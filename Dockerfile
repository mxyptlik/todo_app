# ---- build the React client and TypeScript API ----
FROM node:20-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY client/package.json ./client/package.json
COPY server/package.json ./server/package.json
RUN npm ci

COPY client ./client
COPY server ./server
RUN npm run build --workspace=client && npm run build --workspace=server

# ---- run the API, which serves the built client ----
FROM node:20-slim AS runtime
WORKDIR /app

ARG APP_VERSION=v1
ENV APP_VERSION=$APP_VERSION
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY server/package.json ./server/package.json
RUN npm ci --omit=dev --workspace=@daylist/server

COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/client/dist ./client/dist

EXPOSE 4000
CMD ["node", "server/dist/server.js"]
