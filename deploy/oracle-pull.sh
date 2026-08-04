#!/usr/bin/env bash
set -euo pipefail

cd "$HOME/face-attendance-system"
sudo docker compose -f docker-compose.production.yml pull
sudo docker compose -f docker-compose.production.yml up -d --remove-orphans
sudo docker compose -f docker-compose.production.yml ps
curl --fail http://localhost/api/health
