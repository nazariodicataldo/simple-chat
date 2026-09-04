FROM php:8.5-fpm

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
COPY docker/backend/entrypoint.sh /usr/local/bin/backend-entrypoint

RUN chmod +x /usr/local/bin/backend-entrypoint

WORKDIR /var/www/html

ENTRYPOINT ["backend-entrypoint"]
CMD ["php-fpm"]
