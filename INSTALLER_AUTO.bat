@echo off
title INSTALLATION AUTO-DEMARRAGE — NQ TRACKER
echo.
echo ==========================================
echo    NQ TRACKER — INSTALLATION AUTO-START
echo ==========================================
echo.

set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "HERE=%~dp0"

:: ── Copier send_csv.bat dans Startup ──
echo [1/3] Copie de send_csv.bat dans Startup...
copy /Y "%HERE%send_csv.bat" "%STARTUP%\send_csv.bat" >nul 2>&1
if %errorlevel% neq 0 (
  echo ERREUR : Impossible de copier send_csv.bat
  echo Verifier les droits d'acces.
  pause
  exit /b 1
)
echo       OK

:: ── Creer le VBS dans Startup (chemin fixe vers le .bat dans le meme dossier) ──
echo [2/3] Creation du lanceur silencieux dans Startup...
(
  echo Set WShell = CreateObject("WScript.Shell"^)
  echo WShell.Run Chr(34^) ^& "%STARTUP%\send_csv.bat" ^& Chr(34^), 0, False
) > "%STARTUP%\send_csv_silent.vbs"
echo       OK

:: ── Lancement immediat ──
echo [3/3] Lancement immediat...
wscript "%STARTUP%\send_csv_silent.vbs"
echo       OK

echo.
echo ==========================================
echo   SUCCES — Auto-demarrage configure
echo ==========================================
echo.
echo   Sierra Chart ecrit le CSV
echo   ^> send_csv.bat s'active au demarrage Windows
echo   ^> Envoie au VPS toutes les 15 secondes
echo   ^> Tracker https://salah-tataouine-terminal.vercel.app/nq-live
echo.
echo   AUCUNE INTERVENTION MANUELLE NECESSAIRE.
echo.
timeout /t 8
