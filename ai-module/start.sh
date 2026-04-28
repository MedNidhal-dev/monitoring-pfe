#!/bin/bash
echo "Démarrage de la boucle de monitoring..."
python3 main.py &

echo "Démarrage du serveur API Flask..."
python3 api_server.py
