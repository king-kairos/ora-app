#!/usr/bin/env bash
set -e

echo "=============================="
echo " ORA RUNNER - EXECUTOR LOCAL "
echo "=============================="
echo "Fecha: $(date)"
echo "Directorio: $(pwd)"
echo ""

echo "▶ Node y NPM"
node -v
npm -v
echo ""

echo "▶ Instalando dependencias"
npm install
echo ""

echo "▶ Build"
npm run build || echo "(no build definido)"
echo ""

echo "▶ Ejecutando servidor"
node dist/server.js
