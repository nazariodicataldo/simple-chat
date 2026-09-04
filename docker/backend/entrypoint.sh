#!/bin/sh

set -eu

# Le directory runtime restano in volumi Docker, ma Laravel richiede questa struttura al boot.
mkdir -p \
    storage/framework/cache/data \
    storage/framework/sessions \
    storage/framework/views \
    storage/logs \
    bootstrap/cache

composer install --no-interaction --prefer-dist

# Le migration accompagnano soltanto l'avvio del processo applicativo, non i comandi di bootstrap.
if [ "$1" = "php-fpm" ]; then
    php artisan migrate --force

    # PHP-FPM deve poter aggiornare log e cache durante le richieste successive.
    chown -R www-data:www-data storage bootstrap/cache
fi

exec "$@"
