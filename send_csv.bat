@echo off
:: send_csv.bat — Envoie les CSV Sierra Chart vers le VPS toutes les 15 secondes
:: Prérequis : aucun (curl est intégré Windows 10+)
:: Lancement  : double-clic ou Planificateur de tâches Windows

set VPS=2.29.3.199
set PORT=8766
set SC_DATA=C:\SierraChart_CME\Data

:: Noms des fichiers Sierra Chart (adapter si différents)
set NQ_FILE=%SC_DATA%\nq 30 mn.txt
set ES_FILE=%SC_DATA%\ESU26_FUT_CME[M]  30 Min  #17_GraphData.txt
set GC_FILE=%SC_DATA%\GC.csv.txt
set CL_FILE=%SC_DATA%\CL.csv.txt

echo SC Bridge sender demarré vers %VPS%:%PORT%
echo Envoi toutes les 15 secondes...
echo Fermer cette fenetre pour arrêter.
echo.

:loop
:: Envoi NQ
if exist "%NQ_FILE%" (
    curl -s -X POST -H "Content-Type: text/plain" --data-binary "@%NQ_FILE%" http://%VPS%:%PORT%/upload/NQ >nul 2>&1
    echo [%TIME%] NQ envoye
) else (
    echo [%TIME%] NQ introuvable: %NQ_FILE%
)

:: Envoi ES
if exist "%ES_FILE%" (
    curl -s -X POST -H "Content-Type: text/plain" --data-binary "@%ES_FILE%" http://%VPS%:%PORT%/upload/ES >nul 2>&1
    echo [%TIME%] ES envoye
) else (
    echo [%TIME%] ES introuvable: %ES_FILE%
)

:: Envoi GC (optionnel)
if exist "%GC_FILE%" (
    curl -s -X POST -H "Content-Type: text/plain" --data-binary "@%GC_FILE%" http://%VPS%:%PORT%/upload/GC >nul 2>&1
    echo [%TIME%] GC envoye
)

:: Envoi CL (optionnel)
if exist "%CL_FILE%" (
    curl -s -X POST -H "Content-Type: text/plain" --data-binary "@%CL_FILE%" http://%VPS%:%PORT%/upload/CL >nul 2>&1
    echo [%TIME%] CL envoye
)

echo.
timeout /t 15 /nobreak >nul
goto loop
