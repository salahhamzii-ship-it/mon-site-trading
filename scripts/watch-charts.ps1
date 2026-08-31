# watch-charts.ps1
# Surveillant Sierra Chart — 4 graphiques prioritaires
# Place ce script dans ton dossier de trading et lance-le avant ta session

param(
    [string]$SourceFolder = "C:\SierraChartImages",
    [string]$DestFolder   = "$PSScriptRoot\..\public\charts",
    [switch]$CopyOnly
)

# Mapping des fichiers Sierra Chart vers les noms standardises
$chartMap = @{
    "NQ_TPO_RTH"     = "NQ_TPO_RTH.png"
    "ES_TPO_RTH_OVN" = "ES_TPO_RTH_OVN.png"
    "NQ_30m_AVWAP"   = "NQ_30m_AVWAP.png"
    "ES_30m_AVWAP"   = "ES_30m_AVWAP.png"
}

# Patterns alternatifs Sierra Chart peut nommer differemment
$fallbackMap = @{
    "NQ.png"         = "NQ_TPO_RTH.png"
    "ES.png"         = "ES_TPO_RTH_OVN.png"
    "NQ_30.png"      = "NQ_30m_AVWAP.png"
    "ES_30.png"      = "ES_30m_AVWAP.png"
    "NQ_30min.png"   = "NQ_30m_AVWAP.png"
    "ES_30min.png"   = "ES_30m_AVWAP.png"
}

function Sync-Charts {
    if (-not (Test-Path $DestFolder)) {
        New-Item -ItemType Directory -Path $DestFolder -Force | Out-Null
    }

    $copied = 0
    Get-ChildItem -Path $SourceFolder -Filter "*.png" | ForEach-Object {
        $filename = $_.Name
        $destName = $null

        # Cherche correspondance directe
        if ($chartMap.ContainsValue($filename)) {
            $destName = $filename
        }
        # Cherche correspondance via fallback
        elseif ($fallbackMap.ContainsKey($filename)) {
            $destName = $fallbackMap[$filename]
        }
        # Copie tout ce qui contient NQ ou ES dans le nom
        elseif ($filename -match "NQ|ES") {
            $destName = $filename
        }

        if ($destName) {
            $destPath = Join-Path $DestFolder $destName
            Copy-Item -Path $_.FullName -Destination $destPath -Force
            $ts = Get-Date -Format "HH:mm:ss"
            Write-Host "[$ts] Sync: $filename -> $destName" -ForegroundColor Cyan
            $copied++
        }
    }

    if ($copied -eq 0) {
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] Aucun graphique trouve dans $SourceFolder" -ForegroundColor Yellow
        Write-Host "  Fichiers presents : $(Get-ChildItem $SourceFolder -Filter '*.png' | Select-Object -ExpandProperty Name -join ', ')" -ForegroundColor Gray
    }
}

if ($CopyOnly) {
    Write-Host "Copie unique des graphiques..." -ForegroundColor Green
    Sync-Charts
    Write-Host "Done." -ForegroundColor Green
    exit
}

# Mode surveillance continue
Write-Host "========================================" -ForegroundColor White
Write-Host "  Sierra Chart Watcher actif" -ForegroundColor Green
Write-Host "  Source : $SourceFolder" -ForegroundColor Gray
Write-Host "  Dest   : $DestFolder" -ForegroundColor Gray
Write-Host "  Ctrl+C pour arreter" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor White

# Copie initiale
Sync-Charts

# Surveillance FileSystem
$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $SourceFolder
$watcher.Filter = "*.png"
$watcher.NotifyFilter = [System.IO.NotifyFilters]::LastWrite -bor [System.IO.NotifyFilters]::FileName
$watcher.EnableRaisingEvents = $true
$watcher.IncludeSubdirectories = $false

$action = {
    $path = $Event.SourceEventArgs.FullPath
    $filename = [System.IO.Path]::GetFileName($path)
    Start-Sleep -Milliseconds 200  # attend fin d'ecriture Sierra Chart

    $destName = $null
    if ($Event.MessageData.chartMap.ContainsValue($filename)) {
        $destName = $filename
    } elseif ($Event.MessageData.fallbackMap.ContainsKey($filename)) {
        $destName = $Event.MessageData.fallbackMap[$filename]
    } elseif ($filename -match "NQ|ES") {
        $destName = $filename
    }

    if ($destName) {
        $destPath = Join-Path $Event.MessageData.destFolder $destName
        Copy-Item -Path $path -Destination $destPath -Force
        $ts = Get-Date -Format "HH:mm:ss"
        Write-Host "[$ts] MAJ: $filename" -ForegroundColor Green
    }
}

$eventData = @{
    chartMap   = $chartMap
    fallbackMap = $fallbackMap
    destFolder = $DestFolder
}

Register-ObjectEvent $watcher "Changed" -Action $action -MessageData $eventData | Out-Null
Register-ObjectEvent $watcher "Created" -Action $action -MessageData $eventData | Out-Null

try {
    while ($true) { Start-Sleep -Seconds 1 }
} finally {
    $watcher.EnableRaisingEvents = $false
    $watcher.Dispose()
    Write-Host "`nSurveillance arretee." -ForegroundColor Yellow
}
