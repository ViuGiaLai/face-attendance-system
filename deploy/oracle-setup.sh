#!/usr/bin/env bash
set -euo pipefail

# Run once on an Ubuntu 22.04/24.04 OCI VM as a sudo-capable user.
sudo apt-get update
sudo apt-get install -y ca-certificates curl git
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"

echo "Docker is installed. Sign out and sign in again, then run:"
echo "  git clone <YOUR_REPOSITORY_URL> face-attendance-system"
echo "  cd face-attendance-system"
echo "  cp backend/.env.example backend/.env  # or upload your existing backend/.env securely"
echo "  docker compose -f docker-compose.production.yml up -d --build"
