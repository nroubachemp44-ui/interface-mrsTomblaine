@echo off
TITLE Borne Maison des Sports - LANCEMENT
cd /d "%~dp0"

:: --- CONFIGURATION ---
:: Si vous avez un domaine fixe Ngrok, écrivez-le ici (ex: ma-borne.ngrok-free.app)
:: Sinon, laissez vide (SET NGROK_DOMAIN=)
SET NGROK_DOMAIN=subvitreous-lovably-tania.ngrok-free.dev
:: ---------------------

echo ==========================================
echo    LANCEMENT AUTOMATIQUE DE LA BORNE
echo ==========================================
echo.

:: 1. Lancer le serveur Vite en arrière-plan (fenêtre réduite)
echo [1/2] Lancement du serveur local...
start "Serveur Vite" /min npm run dev

:: 2. Attendre que le serveur soit prêt
echo [INFO] Attente de 5 secondes pour le démarrage du serveur...
timeout /t 5 /nobreak > nul

:: 3. Lancer le tunnel Ngrok
echo [2/2] Lancement du tunnel pour l'accès distant...
echo.

if "%NGROK_DOMAIN%"=="" (
    echo [INFO] Lancement avec une adresse aleatoire...
    start "" ngrok http 3000
) else (
    echo [INFO] Lancement avec le domaine : %NGROK_DOMAIN%
    start "" ngrok http --domain=%NGROK_DOMAIN% 3000
)

:: 4. Lancer le navigateur en mode Kiosque
echo [3/3] Ouverture du navigateur en mode Kiosque...
echo [HINT] Appuyez sur ALT+F4 pour quitter le mode plein ecran de la borne.
timeout /t 3 /nobreak > nul

:: Utilise Microsoft Edge (installe par defaut sur Windows) en mode Kiosque
:: --disable-pinch empeche le zoom avec les doigts sur ecran tactile
start msedge --kiosk http://localhost:3000 --edge-kiosk-type=fullscreen --no-first-run --disable-pinch --overscroll-history-navigation=0 --force-device-scale-factor=1

echo.
echo ==========================================
echo    LA BORNE EST EN COURS D'EXECUTION
echo ==========================================
echo.
pause
