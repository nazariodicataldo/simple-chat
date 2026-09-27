#!/bin/sh

set -eu

image="${1:?Uso: sh docker/production/verify-image.sh IMAGE}"

# I file seguenti sono gli artefatti minimi che permettono al container di avviarsi.
docker run --rm --network none --entrypoint sh "$image" -c '
for required in \
    /usr/local/bin/production-entrypoint \
    /usr/local/bin/production-fatal-listener \
    /opt/production/nginx.conf.template \
    /etc/supervisor/supervisord.conf \
    /var/www/html/artisan \
    /var/www/html/vendor/autoload.php \
    /opt/next/server.js \
    /opt/next/.next/static
do
    if [ ! -e "$required" ]; then
        printf "Artefatto runtime mancante: %s\n" "$required" >&2
        exit 1
    fi
done
'

# I manifest standalone di Next sono ammessi; sorgenti, lockfile, secret e certificati no.
docker run --rm --network none --entrypoint sh "$image" -c '
for forbidden in \
    /var/www/html/composer.json \
    /var/www/html/composer.lock \
    /var/www/html/package.json \
    /var/www/html/pnpm-lock.yaml \
    /var/www/html/phpunit.xml \
    /var/www/html/tests \
    /opt/next/pnpm-lock.yaml \
    /opt/next/.env \
    /opt/next/.cert
do
    if [ -e "$forbidden" ]; then
        printf "File o directory superflua presente: %s\n" "$forbidden" >&2
        exit 1
    fi
done

for root in /var/www/html /opt/next; do
    secret_file=$(find "$root" -type f \
        \( -name ".env" -o -name ".env.*" -o -name "*.pem" -o -name "*.key" \) \
        -print -quit)
    if [ -n "$secret_file" ]; then
        printf "Secret o certificato presente: %s\n" "$secret_file" >&2
        exit 1
    fi
done
'

printf '%s\n' "Controllo filesystem immagine superato: $image"
