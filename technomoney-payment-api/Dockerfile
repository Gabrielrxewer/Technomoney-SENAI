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

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY --from=deps /app/node_modules ./node_modules
RUN npm prune --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/src/migrations ./src/migrations
COPY sequelize-config.cjs ./sequelize-config.cjs
COPY docker/entrypoint.sh ./entrypoint.sh
RUN chmod 550 entrypoint.sh
ENV HOST=0.0.0.0
ENV PORT=3001
ENV SWAGGER_FILE=/app/dist/openapi.yaml
EXPOSE 3001
ENTRYPOINT ["./entrypoint.sh"]
