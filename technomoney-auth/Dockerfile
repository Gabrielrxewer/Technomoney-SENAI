FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY tsconfig.json ./
COPY src ./src
RUN npm run build
RUN if [ -d "src/models" ]; then mkdir -p dist/models && cp -r src/models/* dist/models/; fi
RUN if [ -d "src/config" ]; then mkdir -p dist/config && cp -r src/config/* dist/config/; fi
RUN if [ -f "src/openapi.yaml" ]; then cp src/openapi.yaml dist/openapi.yaml; fi

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY --from=deps /app/node_modules ./node_modules
RUN npm prune --omit=dev
COPY --from=build /app/dist ./dist
RUN apk add --no-cache redis
ENV HOST=0.0.0.0
ENV PORT=4000
ENV SWAGGER_FILE=/app/dist/openapi.yaml
ENV ENTRY_FILE=dist/index.js
ENV REDIS_URL=redis://127.0.0.1:6379
EXPOSE 4000 6379
CMD ["sh","-lc","redis-server --save '' --appendonly no --daemonize yes && node ${ENTRY_FILE}"]
