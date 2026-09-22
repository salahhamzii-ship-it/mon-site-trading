@echo off
setlocal enabledelayedexpansion
title MISE A JOUR + LANCEMENT COCKPIT NQ

:: ── Répertoire de travail (portable — ne pas changer) ─────────────────
set "DIR=%~dp0"
cd /d "%DIR%"
set "LOG=%DIR%update.log"

:: ── Démarrage log (écrase la session précédente) ──────────────────────
echo === DEBUT %date% %time% === > "%LOG%"

call :log "==================================================="
call :log "   MISE A JOUR + LANCEMENT COCKPIT NQ"
call :log "==================================================="
call :log "Dossier : %DIR%"
echo.

:: ═════════════════════════════════════════════════════════════════════
:: [1/10] PREREQUIS
:: ═════════════════════════════════════════════════════════════════════
call :log "[1/10] Verification des prerequis..."

git --version >nul 2>&1
if errorlevel 1 (
    call :err "GIT introuvable. Installer depuis : https://git-scm.com"
    goto :abort
)

node --version >nul 2>&1
if errorlevel 1 (
    call :err "NODE.JS introuvable. Installer depuis : https://nodejs.org"
    goto :abort
)

npm --version >nul 2>&1
if errorlevel 1 (
    call :err "NPM introuvable. Reinstaller Node.js depuis : https://nodejs.org"
    goto :abort
)

python --version >nul 2>&1
if errorlevel 1 (
    call :err "PYTHON introuvable. Installer depuis : https://python.org (cocher Add to PATH)"
    goto :abort
)

call :log "[OK] git, node, npm, python detectes."

:: ═════════════════════════════════════════════════════════════════════
:: [2/10] GIT FETCH
:: ═════════════════════════════════════════════════════════════════════
call :log "[2/10] git fetch origin..."
git fetch origin >> "%LOG%" 2>&1
if errorlevel 1 (
    call :err "git fetch a echoue. Verifiez votre connexion internet."
    goto :abort
)
call :log "[OK] Fetch OK."

:: ═════════════════════════════════════════════════════════════════════
:: [3/10] GIT PULL
:: ═════════════════════════════════════════════════════════════════════
call :log "[3/10] git pull origin main..."
git pull origin main >> "%LOG%" 2>&1
if errorlevel 1 (
    call :err "git pull a echoue. Conflit local possible — ouvrir update.log."
    goto :abort
)
call :log "[OK] Code mis a jour."

:: ═════════════════════════════════════════════════════════════════════
:: [4/10] NPM INSTALL (seulement si necessaire)
:: ═════════════════════════════════════════════════════════════════════
call :log "[4/10] Verification dependances npm..."

if not exist "%DIR%package.json" (
    call :log "Pas de package.json — etape ignoree."
    goto :skip_npm_install
)

set "NEED_INSTALL=0"

:: Pas de node_modules ?
if not exist "%DIR%node_modules\" (
    call :log "node_modules absent → installation requise."
    set "NEED_INSTALL=1"
)

:: Pas de stamp ?
if "%NEED_INSTALL%"=="0" (
    if not exist "%DIR%node_modules\.install_stamp" (
        call :log "Stamp absent → installation requise."
        set "NEED_INSTALL=1"
    )
)

:: package.json plus recent que le stamp ?
if "%NEED_INSTALL%"=="0" (
    powershell -NoProfile -Command "if ((Get-Item 'package.json').LastWriteTime -gt (Get-Item 'node_modules\.install_stamp').LastWriteTime) { exit 1 } else { exit 0 }" >nul 2>&1
    if errorlevel 1 (
        call :log "package.json modifie depuis derniere installation."
        set "NEED_INSTALL=1"
    )
)

if "%NEED_INSTALL%"=="1" (
    call :log "npm install en cours (peut prendre 1 a 5 minutes)..."
    echo  [npm install en cours — patience...]
    npm install >> "%LOG%" 2>&1
    if errorlevel 1 (
        call :err "npm install a echoue. Voir update.log pour le detail."
        goto :abort
    )
    echo. > "%DIR%node_modules\.install_stamp"
    call :log "[OK] Dependances installees."
) else (
    call :log "[OK] Dependances a jour — npm install ignore."
    echo  [OK] Dependances deja installees.
)

:skip_npm_install

:: ═════════════════════════════════════════════════════════════════════
:: [5/10] NPM RUN BUILD
:: ═════════════════════════════════════════════════════════════════════
call :log "[5/10] npm run build..."
echo  [Build en cours — 30 secondes environ...]
npm run build >> "%LOG%" 2>&1
if errorlevel 1 (
    call :err "npm run build a echoue. Voir update.log pour le detail."
    goto :abort
)

if not exist "%DIR%dist\index.html" (
    call :err "dist\index.html absent apres le build — build incomplet."
    goto :abort
)
call :log "[OK] Build reussi — dist\index.html present."

:: ═════════════════════════════════════════════════════════════════════
:: [6/10] TUER L'ANCIEN BRIDGE SUR 8766
:: ═════════════════════════════════════════════════════════════════════
call :log "[6/10] Arret de l'ancien bridge (port 8766)..."

for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":8766 "') do (
    if not "%%a"=="0" (
        call :log "Kill PID %%a"
        taskkill /PID %%a /F >nul 2>&1
    )
)
timeout /t 1 /nobreak >nul
call :log "[OK] Port 8766 libere."

:: ═════════════════════════════════════════════════════════════════════
:: [7/10] LANCER NQ_BRIDGE.PY
:: ═════════════════════════════════════════════════════════════════════
call :log "[7/10] Lancement de nq_bridge.py..."

if not exist "%DIR%nq_bridge.py" (
    call :err "nq_bridge.py introuvable dans %DIR%"
    goto :abort
)

start "NQ Bridge" /MIN python "%DIR%nq_bridge.py"
call :log "[OK] Bridge lance (fenetre minimisee dans la barre des taches)."

:: ═════════════════════════════════════════════════════════════════════
:: [8/10] ATTENTE DEMARRAGE
:: ═════════════════════════════════════════════════════════════════════
call :log "[8/10] Attente demarrage bridge (3 secondes)..."
echo  [Attente 3 secondes...]
timeout /t 3 /nobreak >nul

:: ═════════════════════════════════════════════════════════════════════
:: [9/10] VERIFIER QUE LE BRIDGE REPOND
:: ═════════════════════════════════════════════════════════════════════
call :log "[9/10] Verification health bridge..."
set "HEALTH_OK=0"

powershell -NoProfile -Command "try { $null = Invoke-WebRequest -Uri 'http://localhost:8766/health' -TimeoutSec 5 -UseBasicParsing; exit 0 } catch { exit 1 }" >nul 2>&1
if not errorlevel 1 set "HEALTH_OK=1"

if "%HEALTH_OK%"=="0" (
    curl -s --max-time 5 http://localhost:8766/health >nul 2>&1
    if not errorlevel 1 set "HEALTH_OK=1"
)

if "%HEALTH_OK%"=="0" (
    call :log "[WARN] Bridge lent au demarrage — on ouvre quand meme."
    echo  [WARN] Bridge pas encore pret, ouverture du navigateur quand meme...
) else (
    call :log "[OK] Bridge repond correctement."
)

:: ═════════════════════════════════════════════════════════════════════
:: [10/10] OUVRIR LE NAVIGATEUR
:: ═════════════════════════════════════════════════════════════════════
call :log "[10/10] Ouverture du navigateur..."
start "" "http://localhost:8766/#/cockpit"
call :log "[OK] Navigateur ouvert."

:: ═════════════════════════════════════════════════════════════════════
:: FIN
:: ═════════════════════════════════════════════════════════════════════
echo.
echo  ===================================================
echo    [OK] TOUT EST PRET
echo  ===================================================
echo    Cockpit : http://localhost:8766/#/cockpit
echo    Log     : update.log
echo  ===================================================
echo.
call :log "=== FIN SUCCES %time% ==="
pause
endlocal
exit /b 0

:: ─────────────────────────────────────────────────────────────────────
:: SUBROUTINES
:: ─────────────────────────────────────────────────────────────────────

:log
echo  %~1
echo  %~1 >> "%LOG%"
exit /b 0

:err
echo.
echo  [ERREUR] %~1
echo  [ERREUR] %~1 >> "%LOG%"
echo  Consultez update.log dans le dossier du projet.
echo.
exit /b 0

:abort
echo  === ECHEC %time% === >> "%LOG%"
pause
endlocal
exit /b 1
