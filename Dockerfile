FROM oven/bun:1
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build
EXPOSE 8787
CMD ["bun", "run", "preview", "--", "--host", "0.0.0.0", "--port", "8787"]
