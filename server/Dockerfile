# ---- stage 1: build the React front end ----
FROM node:20-slim AS build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build
# ---- stage 2: run the API, which also serves the built front end ----
FROM node:20-slim
WORKDIR /app/server
ARG APP_VERSION=v1
ENV APP_VERSION=$APP_VERSION
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/ ./
COPY --from=build /app/client/dist /app/client/dist
EXPOSE 3001
CMD ["node", "server.js"]
