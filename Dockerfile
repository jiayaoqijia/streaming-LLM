FROM node:22-slim AS builder
WORKDIR /app
RUN npm install -g pnpm@10
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY tsconfig.node.json ./
COPY src/ ./src/
RUN pnpm build

FROM node:22-slim
WORKDIR /app
RUN npm install -g pnpm@10
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod
COPY --from=builder /app/dist ./dist
COPY web/ ./web/
EXPOSE 8787
ENV PORT=8787
CMD ["node", "dist/node.js"]
