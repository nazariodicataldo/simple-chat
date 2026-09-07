#!/usr/bin/env bash

set -euo pipefail

compose_config="$(docker compose --env-file compose.env config)"

service_image() {
    local service="$1"

    # Legge dal modello risolto l'immagine assegnata al servizio richiesto.
    awk -v wanted="  ${service}:" '
        $0 == wanted { inside = 1; next }
        inside && $0 ~ /^  [a-z0-9_-]+:$/ { exit }
        inside && $1 == "image:" { print $2; exit }
    ' <<<"$compose_config"
}

service_has_build() {
    local service="$1"

    # Reverb e Horizon devono avviare l'immagine backend senza build proprie.
    awk -v wanted="  ${service}:" '
        $0 == wanted { inside = 1; next }
        inside && $0 ~ /^  [a-z0-9_-]+:$/ { exit }
        inside && $1 == "build:" { found = 1 }
        END { exit found ? 0 : 1 }
    ' <<<"$compose_config"
}

backend_image="$(service_image backend)"
reverb_image="$(service_image reverb)"
horizon_image="$(service_image horizon)"

if [ -z "$backend_image" ] ||
    [ "$reverb_image" != "$backend_image" ] ||
    [ "$horizon_image" != "$backend_image" ]; then
    printf 'expected one backend image, got backend=%s reverb=%s horizon=%s\n' \
        "$backend_image" "$reverb_image" "$horizon_image" >&2
    exit 1
fi

if service_has_build reverb || service_has_build horizon; then
    printf 'reverb and horizon must not define independent build sections\n' >&2
    exit 1
fi

printf 'backend, reverb and horizon share %s\n' "$backend_image"
