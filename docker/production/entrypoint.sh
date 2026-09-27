#!/bin/sh

set -eu

: "${PORT:=8080}"
export PORT
export BACKEND_INTERNAL_URL="${BACKEND_INTERNAL_URL:-http://127.0.0.1:${PORT}}"

# Il runtime e' gia' installato nell'immagine; qui si preparano solo directory scrivibili e config dipendente da PORT.
mkdir -p \
    storage/framework/cache/data \
    storage/framework/sessions \
    storage/framework/views \
    storage/logs \
    bootstrap/cache \
    /tmp/nginx/client_body \
    /tmp/nginx/fastcgi \
    /tmp/nginx/proxy \
    /tmp/nginx/scgi \
    /tmp/nginx/uwsgi

printf '%s\n' 'Production migration started.'
php artisan migrate --force
printf '%s\n' 'Production migration completed.'

envsubst '${PORT}' < /opt/production/nginx.conf.template > /tmp/production-nginx.conf

exec /usr/bin/supervisord -c /etc/supervisor/supervisord.conf
