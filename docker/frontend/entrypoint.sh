#!/bin/sh

set -eu

# Il bind mount contiene solo il sorgente: dipendenze e store pnpm restano
# nei volumi Docker. Il timeout tollera download lenti senza cambiare lockfile.
pnpm install --frozen-lockfile --store-dir /pnpm-cache --fetch-timeout 300000

exec "$@"
