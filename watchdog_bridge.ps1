# SC Bridge Watchdog — verifie toutes les 5 min que le bridge repond
# Si mort -> relance startup_bridge.bat
# Logs dans C:\SierraChart_CME\Logs\watchdog.log

$LogFile   = "C:\SierraChart_CME\Logs\watchdog.log"
$BatFile   = "C:\SierraChart_CME\startup_bridge.bat"
$BridgeUrl = "http://localhost:8766/health"
$MaxLog    = 500   # lignes max avant rotation

function Write-Log($msg) {
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$ts] $msg"
    Write-Host $line
    $dir = Split-Path $LogFile
    if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    Add-Content -Path $LogFile -Value $line -Encoding UTF8
    # Rotation legere : garder les 500 dernieres lignes
    try {
        $lines = Get-Content $LogFile -ErrorAction Stop
        if ($lines.Count -gt $MaxLog) {
            $lines | Select-Object -Last $MaxLog | Set-Content $LogFile -Encoding UTF8
        }
    } catch {}
}

function Test-Bridge {
    try {
        $r = Invoke-WebRequest -Uri $BridgeUrl -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        return $r.StatusCode -eq 200
    } catch {
        return $false
    }
}

function Restart-Bridge {
    Write-Log "BRIDGE MORT — lancement $BatFile"
    # Tuer les anciens processus
    Get-Process -Name "node"  -ErrorAction SilentlyContinue | Stop-Process -Force
    Get-Process -Name "ngrok" -ErrorAction SilentlyContinue | Stop-Process -Force
    Start-Sleep -Seconds 2
    # Relancer le bat en arriere-plan
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c `"$BatFile`"" -WindowStyle Hidden
    Start-Sleep -Seconds 15
    # Verifier que ca a redemarre
    if (Test-Bridge) {
        Write-Log "RESTART OK — bridge repond sur :8766"
    } else {
        Write-Log "RESTART ECHEC — bridge ne repond toujours pas"
    }
}

# ── MAIN ──────────────────────────────────────────────────────────────────────
Write-Log "Watchdog demarre — verification bridge :8766"

if (Test-Bridge) {
    Write-Log "OK — bridge vivant"
} else {
    Write-Log "ALERTE — bridge ne repond pas"
    Restart-Bridge
}
