#!/bin/sh
set -euo pipefail

if [ "${SKIP_DB_MIGRATIONS:-0}" = "1" ]; then
  echo "[entrypoint] SKIP_DB_MIGRATIONS=1 detectado - pulando migrations."
else
  echo "[entrypoint] Aplicando migrations do banco de dados..."
  node -e "require('child_process').execSync('npx sequelize-cli db:migrate', { stdio: 'inherit' });"
  echo "[entrypoint] Migrations aplicadas com sucesso."
fi

if [ -z "${SWAGGER_FILE:-}" ] && [ -f "/app/dist/openapi.yaml" ]; then
  export SWAGGER_FILE=/app/dist/openapi.yaml
fi

exec node "${ENTRY_FILE:-dist/server.js}"
