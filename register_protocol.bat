@echo off
title Enregistrement protocole SC Bridge
echo ================================================
echo   Enregistrement du protocole scbridge://
echo   A faire UNE SEULE FOIS
echo ================================================
echo.

:: Chemin vers lancer_bridge.bat (meme dossier que ce fichier)
set "LAUNCHER=%~dp0lancer_bridge.bat"

echo Enregistrement dans le registre Windows...
reg add "HKCU\Software\Classes\scbridge" /ve /d "URL:SC Bridge Protocol" /f >nul
reg add "HKCU\Software\Classes\scbridge" /v "URL Protocol" /d "" /f >nul
reg add "HKCU\Software\Classes\scbridge\DefaultIcon" /ve /d "%SystemRoot%\system32\cmd.exe,0" /f >nul
reg add "HKCU\Software\Classes\scbridge\shell" /f >nul
reg add "HKCU\Software\Classes\scbridge\shell\open" /f >nul
reg add "HKCU\Software\Classes\scbridge\shell\open\command" /ve /d "\"%LAUNCHER%\"" /f >nul

echo.
echo OK ! Protocole scbridge:// enregistre.
echo.
echo Desormais le bouton LANCER BRIDGE dans le calculateur
echo lancera automatiquement le bridge Sierra Chart.
echo.
pause
