#!/bin/bash
set -e

# Deployment script from Mac mini M5 to Mac M1 (OrbStack Server)
REMOTE_HOST="mac-m1"
REMOTE_DIR="/Users/goldohrack/docker/superu"
LOCAL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "🚀 [1/3] Construction du frontend si nécessaire..."
if [ -d "$LOCAL_DIR/frontend" ]; then
    npm --prefix "$LOCAL_DIR/frontend" run build --silent
fi

echo "📦 [2/3] Synchronisation des fichiers vers le Mac M1 ($REMOTE_HOST)..."
rsync -avz --delete \
    --exclude '.git' \
    --exclude 'venv' \
    --exclude '__pycache__' \
    --exclude '*.pyc' \
    --exclude 'data/' \
    --exclude 'uploads/' \
    --exclude 'frontend/node_modules/' \
    --exclude '.env' \
    "$LOCAL_DIR/" "$REMOTE_HOST:$REMOTE_DIR/"

echo "🐳 [3/3] Rechargement du conteneur Docker sur OrbStack..."
ssh "$REMOTE_HOST" "
    export PATH=\"/usr/local/bin:~/.orbstack/bin:\$PATH\"
    cd $REMOTE_DIR
    docker compose up -d --build
"

echo "✅ Déploiement terminé avec succès ! L'application est à jour sur OrbStack."
