FROM oven/bun:1
WORKDIR /app
COPY package.json bun.lock ./
RUN NODE_ENV=development bun install --frozen-lockfile
COPY . .
RUN bun run build
ENV NODE_ENV=production
EXPOSE 8787
CMD ["bun", "run", "start"]
