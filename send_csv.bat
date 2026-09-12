@echo off
:: send_csv.bat — Envoie les CSV Sierra Chart vers le VPS toutes les 15 secondes
:: Auto-detection du fichier NQ dans C:\SierraChart_CME\Data\

set BRIDGE=localhost
set PORT=8766
set SC_DATA=C:\SierraChart_CME\Data

:: ── Auto-detection NQ : priorité NQ_auto.csv puis scan du dossier ──
set NQ_FILE=
if exist "%SC_DATA%\NQ_auto.csv"     set NQ_FILE=%SC_DATA%\NQ_auto.csv
if exist "%SC_DATA%\NQ_auto.csv.txt" set NQ_FILE=%SC_DATA%\NQ_auto.csv.txt
if "%NQ_FILE%"=="" (
  for %%F in ("%SC_DATA%\NQ*.csv" "%SC_DATA%\NQ*.txt" "%SC_DATA%\nq*.txt" "%SC_DATA%\nq*.csv") do (
    if "%NQ_FILE%"=="" set NQ_FILE=%%F
  )
)

:: ── Auto-detection ES ──
set ES_FILE=
if exist "%SC_DATA%\ES_auto.csv"     set ES_FILE=%SC_DATA%\ES_auto.csv
if exist "%SC_DATA%\ES_auto.csv.txt" set ES_FILE=%SC_DATA%\ES_auto.csv.txt
if "%ES_FILE%"=="" (
  for %%F in ("%SC_DATA%\ES*.csv" "%SC_DATA%\ES*.txt" "%SC_DATA%\es*.txt") do (
    if "%ES_FILE%"=="" set ES_FILE=%%F
  )
)

:loop
:: ── Envoi NQ ──
if not "%NQ_FILE%"=="" (
  if exist "%NQ_FILE%" (
    curl -s -X POST -H "Content-Type: text/plain" --data-binary "@%NQ_FILE%" http://%BRIDGE%:%PORT%/upload/NQ >nul 2>&1
  )
)

:: ── Envoi ES ──
if not "%ES_FILE%"=="" (
  if exist "%ES_FILE%" (
    curl -s -X POST -H "Content-Type: text/plain" --data-binary "@%ES_FILE%" http://%BRIDGE%:%PORT%/upload/ES >nul 2>&1
  )
)

timeout /t 15 /nobreak >nul
goto loop
