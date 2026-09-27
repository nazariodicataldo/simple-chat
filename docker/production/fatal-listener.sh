#!/bin/sh

set -eu

printf '%s\n' 'READY'

while IFS= read -r header; do
    payload_length=$(printf '%s\n' "$header" | sed -n 's/.*len:\([0-9][0-9]*\).*/\1/p')

    if [ -z "$payload_length" ]; then
        printf '%s\n' 'Supervisor event header did not contain a payload length.' >&2
        exit 1
    fi

    # Supervisor invia un payload a lunghezza dichiarata, non necessariamente terminato da newline.
    dd bs=1 count="$payload_length" of=/dev/null 2>/dev/null

    case "$header" in
        *eventname:PROCESS_STATE_FATAL*)
            printf '%s\n' 'Essential production process reached FATAL; stopping the container.' >&2
            kill -TERM 1
            ;;
    esac

    printf 'RESULT 2\nOK'
done
