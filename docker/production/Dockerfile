FROM php:8.5-fpm AS backend-build

RUN apt-get update \
    && apt-get install --yes --no-install-recommends \
        git \
        libonig-dev \
        libpq-dev \
        libxml2-dev \
        libzip-dev \
        unzip \
    && docker-php-ext-install \
        mbstring \
        pcntl \
        pdo_pgsql \
        pgsql \
        xml \
        zip \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY backend/composer.json backend/composer.lock ./

# Le dipendenze production sono risolte nel build: il boot non deve modificare l'immagine.
RUN composer install \
        --no-dev \
        --no-interaction \
        --no-progress \
        --no-scripts \
        --prefer-dist \
        --classmap-authoritative

COPY backend/artisan ./artisan
COPY backend/app ./app
COPY backend/bootstrap ./bootstrap
COPY backend/config ./config
COPY backend/database ./database
COPY backend/public ./public
COPY backend/resources ./resources
COPY backend/routes ./routes

# La classmap autorevole va rigenerata dopo la copia delle classi applicative.
RUN composer dump-autoload \
        --no-dev \
        --no-interaction \
        --classmap-authoritative \
        --no-scripts

RUN mkdir -p \
        storage/framework/cache/data \
        storage/framework/sessions \
        storage/framework/views \
        storage/logs \
        bootstrap/cache \
    && php artisan package:discover --ansi \
    # La build deve fallire se il classmap production non vede le route applicative.
    && php artisan route:list --path=api/register --except-vendor >/dev/null

FROM node:24.19.0-bookworm-slim AS frontend-build

RUN corepack enable && corepack install --global pnpm@11.20.0

WORKDIR /app

COPY frontend/package.json frontend/pnpm-lock.yaml frontend/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY frontend ./

# La chiave Reverb e' pubblica; host e porta production restano invece runtime e same-origin.
ARG NEXT_PUBLIC_REVERB_APP_KEY
ENV NEXT_PUBLIC_REVERB_APP_KEY=${NEXT_PUBLIC_REVERB_APP_KEY}

RUN pnpm build

FROM node:24.19.0-bookworm-slim AS node-runtime

FROM php:8.5-fpm

RUN apt-get update \
    && apt-get install --yes --no-install-recommends \
        gettext-base \
        libonig5 \
        libpq5 \
        libxml2 \
        libzip5 \
        nginx \
        supervisor \
    && rm -rf /var/lib/apt/lists/*

COPY --from=backend-build /usr/local/lib/php/extensions/ /usr/local/lib/php/extensions/
COPY --from=backend-build /usr/local/etc/php/conf.d/ /usr/local/etc/php/conf.d/

COPY --from=node-runtime /usr/local/bin/node /usr/local/bin/node
RUN node --version

RUN groupadd --gid 1000 app \
    && useradd --uid 1000 --gid app --create-home --shell /usr/sbin/nologin app

WORKDIR /var/www/html

COPY --from=backend-build /var/www/html/app ./app
COPY --from=backend-build /var/www/html/artisan ./artisan
COPY --from=backend-build /var/www/html/bootstrap ./bootstrap
COPY --from=backend-build /var/www/html/config ./config
COPY --from=backend-build /var/www/html/database ./database
COPY --from=backend-build /var/www/html/public ./public
COPY --from=backend-build /var/www/html/resources ./resources
COPY --from=backend-build /var/www/html/routes ./routes
COPY --from=backend-build /var/www/html/storage ./storage
COPY --from=backend-build /var/www/html/vendor ./vendor

COPY --from=frontend-build /app/.next/standalone /opt/next
COPY --from=frontend-build /app/.next/static /opt/next/.next/static

COPY docker/production/nginx.conf.template /opt/production/nginx.conf.template
COPY docker/production/php-fpm-pool.conf /usr/local/etc/php-fpm.d/www.conf
COPY docker/production/supervisord.conf /etc/supervisor/supervisord.conf
COPY docker/production/entrypoint.sh /usr/local/bin/production-entrypoint
COPY docker/production/fatal-listener.sh /usr/local/bin/production-fatal-listener

RUN chmod +x \
        /usr/local/bin/production-entrypoint \
        /usr/local/bin/production-fatal-listener \
    && mkdir -p \
        storage/framework/cache/data \
        storage/framework/sessions \
        storage/framework/views \
        storage/logs \
        bootstrap/cache \
        /tmp/nginx/client_body \
        /tmp/nginx/fastcgi \
        /tmp/nginx/proxy \
        /tmp/nginx/scgi \
        /tmp/nginx/uwsgi \
    && chown -R app:app /var/www/html /opt/next /tmp/nginx

ENV PORT=8080 \
    REVERB_HOST=127.0.0.1 \
    REVERB_PORT=8081 \
    REVERB_SCHEME=http \
    REVERB_SERVER_HOST=127.0.0.1 \
    REVERB_SERVER_PORT=8081
EXPOSE 8080
USER app

ENTRYPOINT ["/usr/local/bin/production-entrypoint"]
