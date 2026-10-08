#!/usr/bin/env bash
cd "$(dirname "$0")"

if [ ! -d "venv" ]; then
    echo "Création de l'environnement virtuel Python..."
    python3 -m venv venv
    ./venv/bin/pip install -r requirements.txt
fi

if [ ! -f "frontend/dist/index.html" ]; then
    echo "Construction du frontend..."
    cd frontend && npm install && npm run build && cd ..
fi

echo "Lancement de Super U Ticket Manager sur http://localhost:8000..."
./venv/bin/python3 run.py
