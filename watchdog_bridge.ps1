# SC Bridge Watchdog — verifie toutes les 5 min que le bridge repond
# Si mort -> relance startup_bridge.bat
# Logs dans C:\SierraChart_CME\Logs\watchdog.log

$LogFile    = "C:\SierraChart_CME\Logs\watchdog.log"
$BatFile    = "C:\SierraChart_CME\startup_bridge.bat"
$BridgeUrl  = "http://localhost:8766/health"
$NgrokUrl   = "https://hatbox-placidly-crabmeat.ngrok-free.dev/health"
$NgrokDomain = "hatbox-placidly-crabmeat.ngrok-free.dev"
$MaxLog     = 500   # lignes max avant rotation

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

function Test-Ngrok {
    # Vérifie que ngrok tourne ET que le tunnel répond depuis l'extérieur
    $proc = Get-Process -Name "ngrok" -ErrorAction SilentlyContinue
    if (-not $proc) { return $false }
    try {
        $r = Invoke-WebRequest -Uri $NgrokUrl -TimeoutSec 8 -UseBasicParsing `
             -Headers @{ "ngrok-skip-browser-warning" = "1" } -ErrorAction Stop
        return $r.StatusCode -eq 200
    } catch {
        return $false
    }
}

function Restart-Ngrok {
    Write-Log "NGROK MORT — redémarrage tunnel $NgrokDomain"
    Show-Toast "🔴 ngrok OFFLINE" "Redémarrage tunnel en cours..."
    Get-Process -Name "ngrok" -ErrorAction SilentlyContinue | Stop-Process -Force
    Start-Sleep -Seconds 2
    $ngrokCmd = "ngrok http 8766 --domain=$NgrokDomain"
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c $ngrokCmd" -WindowStyle Hidden
    Start-Sleep -Seconds 10
    if (Test-Ngrok) {
        Write-Log "NGROK RESTART OK — tunnel actif"
        Show-Toast "🟢 ngrok RESTAURE" "Tunnel $NgrokDomain actif"
    } else {
        Write-Log "NGROK RESTART ECHEC — relance startup complet"
        Show-Toast "⚠️ ngrok ECHEC" "Relance startup_bridge.bat"
        Restart-Bridge
    }
}

function Show-Toast($title, $msg) {
    try {
        [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
        [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom, ContentType = WindowsRuntime] | Out-Null
        $xml = [Windows.Data.Xml.Dom.XmlDocument]::new()
        $xml.LoadXml("<toast><visual><binding template='ToastGeneric'><text>$title</text><text>$msg</text></binding></visual></toast>")
        $toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
        $notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("SC Bridge")
        $notifier.Show($toast)
    } catch {}
}

function Restart-Bridge {
    Write-Log "BRIDGE MORT — lancement $BatFile"
    Show-Toast "🔴 SC Bridge OFFLINE" "Redemarrage en cours..."
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
        Show-Toast "🟢 SC Bridge RESTAURE" "Bridge redémarre et repond sur :8766"
    } else {
        Write-Log "RESTART ECHEC — bridge ne repond toujours pas"
        Show-Toast "⚠️ SC Bridge ECHEC RESTART" "Verifier manuellement le bridge"
    }
}

# ── MAIN ──────────────────────────────────────────────────────────────────────
Write-Log "Watchdog demarre — verification bridge :8766 + ngrok tunnel"

$bridgeOk = Test-Bridge
$ngrokOk  = Test-Ngrok

if ($bridgeOk -and $ngrokOk) {
    Write-Log "OK — bridge :8766 vivant + ngrok tunnel actif"
} elseif (-not $bridgeOk) {
    Write-Log "ALERTE — bridge ne repond pas (ngrok=$ngrokOk)"
    Restart-Bridge
} elseif (-not $ngrokOk) {
    Write-Log "ALERTE — bridge OK mais ngrok tunnel mort"
    Restart-Ngrok
}
