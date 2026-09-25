# Build from the repository root:  docker build -f server/Dockerfile -t gunluk-server .
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/package.json
COPY server/package.json server/package.json
COPY mobile/package.json mobile/package.json
RUN npm ci --workspace server --include-workspace-root=false --ignore-scripts
COPY packages/core packages/core
COPY server server
WORKDIR /app/server
EXPOSE 8787
USER node
CMD ["npx", "tsx", "src/index.ts"]
