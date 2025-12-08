#!/bin/sh
set -e

if [ "${SKIP_DB_MIGRATIONS}" != "1" ]; then
  npx sequelize-cli db:migrate \
    --env production \
    --config sequelize-config.cjs \
    --migrations-path src/migrations
fi

exec node dist/index.js
