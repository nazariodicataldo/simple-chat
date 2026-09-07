FROM node:24.19.0-bookworm-slim

RUN corepack enable && corepack install --global pnpm@11.20.0

COPY docker/frontend/entrypoint.sh /usr/local/bin/frontend-entrypoint

RUN chmod +x /usr/local/bin/frontend-entrypoint

WORKDIR /app

ENTRYPOINT ["frontend-entrypoint"]
CMD ["pnpm", "dev", "--hostname", "0.0.0.0", "--port", "3000"]
