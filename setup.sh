#!/bin/bash
set -e

echo "==================================================="
echo "  NoteFlow - Automated Docker Setup (Linux/macOS)"
echo "==================================================="

if [ ! -f .env ]; then
    echo "[1/6] Creating root .env from .env.docker.example..."
    cp .env.docker.example .env
else
    echo "[1/6] Root .env already exists. Skipping copy."
fi

if [ ! -f backend/.env ]; then
    echo "      Creating backend/.env from backend/.env.example..."
    cp backend/.env.example backend/.env
else
    echo "      backend/.env already exists. Skipping copy."
fi

echo "[2/6] Starting database, Redis, and PHP-FPM..."
docker compose up -d --build mysql redis php-fpm

echo "[3/6] Installing backend dependencies into the Docker vendor volume..."
docker compose exec php-fpm composer install --no-interaction

echo "[4/6] Initializing Laravel app, storage, and demo database..."
docker compose exec php-fpm php artisan key:generate --force
docker compose exec php-fpm php artisan config:clear
docker compose exec php-fpm php artisan storage:link || true
docker compose exec php-fpm php artisan migrate:fresh --seed --force

echo "[5/6] Building frontend SPA..."
docker compose --profile tools run --rm frontend-builder

echo "[6/6] Starting app services..."
docker compose up -d --build queue-worker reverb nginx
docker compose restart php-fpm queue-worker reverb nginx

echo "==================================================="
echo "  Setup complete. NoteFlow is running at:"
echo "  http://localhost"
echo
echo "  Demo accounts:"
echo "  alice@example.test / Password123!"
echo "  bob@example.test   / Password123!"
echo "==================================================="
