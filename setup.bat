@echo off
setlocal

echo ===================================================
echo   NoteFlow - Automated Docker Setup (Windows)
echo ===================================================
echo.

IF NOT EXIST .env (
    echo [1/6] Creating root .env from .env.docker.example...
    copy .env.docker.example .env >nul
) ELSE (
    echo [1/6] Root .env already exists. Skipping copy.
)

IF NOT EXIST backend\.env (
    echo       Creating backend\.env from backend\.env.example...
    copy backend\.env.example backend\.env >nul
) ELSE (
    echo       backend\.env already exists. Skipping copy.
)

echo.
echo [2/6] Starting database, Redis, and PHP-FPM...
docker compose up -d --build mysql redis php-fpm
IF ERRORLEVEL 1 GOTO :error

echo.
echo [3/6] Installing backend dependencies into the Docker vendor volume...
docker compose exec php-fpm composer install --no-interaction
IF ERRORLEVEL 1 GOTO :error

echo.
echo [4/6] Initializing Laravel app, storage, and demo database...
docker compose exec php-fpm php artisan key:generate --force
IF ERRORLEVEL 1 GOTO :error
docker compose exec php-fpm php artisan config:clear
IF ERRORLEVEL 1 GOTO :error
docker compose exec php-fpm php artisan storage:link
docker compose exec php-fpm php artisan migrate:fresh --seed --force
IF ERRORLEVEL 1 GOTO :error

echo.
echo [5/6] Building frontend SPA...
docker compose --profile tools run --rm frontend-builder
IF ERRORLEVEL 1 GOTO :error

echo.
echo [6/6] Starting app services...
docker compose up -d --build queue-worker reverb nginx
IF ERRORLEVEL 1 GOTO :error
docker compose restart php-fpm queue-worker reverb nginx
IF ERRORLEVEL 1 GOTO :error

echo.
echo ===================================================
echo   Setup complete. NoteFlow is running at:
echo   http://localhost
echo.
echo   Demo accounts:
echo   alice@example.test / Password123!
echo   bob@example.test   / Password123!
echo ===================================================
pause
exit /b 0

:error
echo.
echo ===================================================
echo   Setup failed. Check the Docker output above.
echo ===================================================
pause
exit /b 1
