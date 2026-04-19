FROM node:22-alpine AS build
WORKDIR /app

COPY package.json tsconfig.json ./
RUN npm install

COPY src ./src
RUN npm run build
RUN npm prune --omit=dev

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV NODE_MAX_HTTP_HEADER_SIZE_BYTES=16384

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

EXPOSE 8080
USER node
CMD ["sh", "-c", "node --max-http-header-size=${NODE_MAX_HTTP_HEADER_SIZE_BYTES} dist/server.js"]
