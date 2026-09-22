@echo off
setlocal enabledelayedexpansion
title Installation Alarme Nocturne NQ

echo.
echo  ================================================
echo    ALARME NOCTURNE NQ -- Installation
echo  ================================================
echo.

:: ── Vérifier Python ───────────────────────────────────────────────────────
python --version >nul 2>^&1
if errorlevel 1 (
    echo  [ERREUR] Python introuvable.
    echo           Installer depuis https://python.org puis relancer.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('python --version 2^>^&1') do echo  Python : %%v

:: ── Chemin absolu du script ───────────────────────────────────────────────
set "SCRIPT_DIR=%~dp0"
set "ALARM_SCRIPT=%SCRIPT_DIR%alarm_service.py"

if not exist "%ALARM_SCRIPT%" (
    echo  [ERREUR] alarm_service.py absent dans %SCRIPT_DIR%
    pause
    exit /b 1
)

:: ── Trouver pythonw.exe ───────────────────────────────────────────────────
for /f "tokens=*" %%p in ('python -c "import sys,os;print(os.path.join(os.path.dirname(sys.executable),'pythonw.exe'))"') do set "PYTHONW=%%p"
if not exist "%PYTHONW%" (
    for /f "tokens=*" %%p in ('where python 2^>nul') do set "PYTHONW=%%p"
)
echo  Executable : %PYTHONW%
echo  Script     : %ALARM_SCRIPT%
echo.

:: ── Méthode 1 : schtasks (admin, priorité haute) ─────────────────────────
echo  [1/3] Task Scheduler -- tentative droits admin...
schtasks /create /tn "NQAlarm" /tr "\"%PYTHONW%\" \"%ALARM_SCRIPT%\"" /sc onlogon /ru "%USERNAME%" /rl highest /f >nul 2>^&1
if not errorlevel 1 (
    echo  [OK] Tache "NQAlarm" creee (onlogon, droits admin).
    goto :done
)

:: ── Méthode 2 : schtasks (droits standard) ───────────────────────────────
echo  [2/3] Task Scheduler -- tentative droits standard...
schtasks /create /tn "NQAlarm" /tr "\"%PYTHONW%\" \"%ALARM_SCRIPT%\"" /sc onlogon /ru "%USERNAME%" /f >nul 2>^&1
if not errorlevel 1 (
    echo  [OK] Tache "NQAlarm" creee (onlogon, droits standard).
    goto :done
)

:: ── Méthode 3 : dossier Startup (VBS silencieux) ─────────────────────────
echo  [3/3] Fallback -- dossier Startup Windows...
set "STARTUP=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "VBS=%STARTUP%\NQAlarm.vbs"

(
    echo Set ws = CreateObject^("WScript.Shell"^)
    echo ws.Run """!PYTHONW!""" & " " & """!ALARM_SCRIPT!""", 0, False
) > "%VBS%"

if exist "%VBS%" (
    echo  [OK] NQAlarm.vbs cree dans le dossier Startup.
    echo       → Actif au prochain demarrage Windows.
    goto :done
)

echo.
echo  [ERREUR] Les 3 methodes ont echoue.
echo           Lancer manuellement : pythonw "%ALARM_SCRIPT%"
pause
exit /b 1

:done
echo.
echo  ================================================
echo    ALARME NQ INSTALLEE AVEC SUCCES
echo  ================================================
echo.
echo  → L'alarme se lance automatiquement a la connexion Windows.
echo.
echo  TESTS (a faire maintenant) :
echo    python alarm_service.py --test-sound    (son 5s)
echo    python alarm_service.py --test-popup    (popup)
echo    python alarm_service.py --test-trigger  (son + popup)
echo.
echo  DESINSTALLER :
echo    schtasks /delete /tn "NQAlarm" /f
echo    (ou supprimer NQAlarm.vbs dans le dossier Startup)
echo.
pause
endlocal
