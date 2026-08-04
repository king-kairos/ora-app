#!/usr/bin/env bash
set -e

# ===============================
# OPS APPLY — VERSION ESTABLE
# ===============================

if ! command -v jq >/dev/null 2>&1; then
  echo "❌ jq no está instalado. Instálalo con: sudo apt install jq"
  exit 1
fi

TITLE="$1"
DESC="$2"
FILE_PATH="$3"
FILE_CONTENT="$4"

if [ -z "$TITLE" ] || [ -z "$DESC" ] || [ -z "$FILE_PATH" ] || [ -z "$FILE_CONTENT" ]; then
  echo "Uso:"
  echo "./scripts/ops_apply.sh \"Titulo\" \"Descripcion\" \"ruta/archivo.ts\" \"contenido\""
  exit 1
fi

KAIROS_ROOT="${KAIROS_ROOT:-KAIROS.ROOT}"

echo "🚀 Proponiendo OPS..."

PROPOSE_JSON=$(cat <<EOF
{
  "title": "$TITLE",
  "description": "$DESC",
  "files": [
    {
      "path": "$FILE_PATH",
      "content": $(jq -Rs . <<< "$FILE_CONTENT")
    }
  ]
}
EOF
)

PROPOSE_RES=$(curl -s -X POST "http://localhost:3000/ops/propose" \
  -H "Content-Type: application/json" \
  -d "$PROPOSE_JSON"
)

echo "📦 Respuesta propose:"
echo "$PROPOSE_RES"

ID=$(echo "$PROPOSE_RES" | jq -r '.proposal.id')

if [ "$ID" = "null" ] || [ -z "$ID" ]; then
  echo "❌ No se pudo obtener proposal.id"
  exit 1
fi

echo "✅ Proposal creada con ID: $ID"
echo "🔐 Aprobando..."

APPROVE_RES=$(curl -s -X POST "http://localhost:3000/ops/approve" \
  -H "Content-Type: application/json" \
  -H "X-KAIROS-ROOT: $KAIROS_ROOT" \
  -d "{\"id\":\"$ID\"}"
)

echo "📦 Resultado approve:"
echo "$APPROVE_RES"
