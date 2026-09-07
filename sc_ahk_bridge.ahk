; ─── SC AHK BRIDGE — Camel Market Cockpit ────────────────────────────────────
; Lit sc_order_queue.txt et envoie les ordres à Sierra Chart via keystrokes SIM
; Requires: AutoHotKey v2 (https://www.autohotkey.com/)
; Instructions :
;   1. Installer AutoHotKey v2
;   2. Configurer les raccourcis Sierra Chart (voir ci-dessous)
;   3. Double-cliquer ce fichier pour lancer le bridge
;   4. Icône dans la barre de tâches = bridge actif
;
; RACCOURCIS SIERRA CHART à configurer dans SC :
;   Trade > Trade Settings > Keyboard Shortcuts
;   BUY  Market  → Ctrl+Shift+B
;   SELL Market  → Ctrl+Shift+S
;   FLATTEN All  → Ctrl+Shift+F
; ─────────────────────────────────────────────────────────────────────────────

#Requires AutoHotKey v2.0
#SingleInstance Force
Persistent

ORDER_FILE := "C:\SierraChart_CME\Data\sc_order_queue.txt"
POLL_MS    := 500   ; Vérification toutes les 500ms
SC_TITLE   := "SierraChart"  ; Titre de la fenêtre Sierra Chart (partiel)

; Raccourcis Sierra Chart (modifier selon votre config SC)
HOTKEY_BUY     := "^+b"   ; Ctrl+Shift+B
HOTKEY_SELL    := "^+s"   ; Ctrl+Shift+S
HOTKEY_FLATTEN := "^+f"   ; Ctrl+Shift+F

TrayTip "SC AHK Bridge", "Démarré — poll " ORDER_FILE, 3

SetTimer PollOrderFile, POLL_MS

PollOrderFile() {
    global ORDER_FILE, SC_TITLE, HOTKEY_BUY, HOTKEY_SELL, HOTKEY_FLATTEN

    if !FileExist(ORDER_FILE)
        return

    content := FileRead(ORDER_FILE, "UTF-8")
    if !InStr(content, "Status=PENDING")
        return

    ; Parse les champs
    action   := RegExReplace(RegExMatch(content, "Action=(\w+)", &m) ? m[1] : "", "^\s+|\s+$")
    symbol   := RegExReplace(RegExMatch(content, "Symbol=(\S+)", &m)  ? m[1] : "", "^\s+|\s+$")
    qty      := RegExReplace(RegExMatch(content, "Quantity=(\d+)", &m) ? m[1] : "1", "^\s+|\s+$")
    otype    := RegExReplace(RegExMatch(content, "OrderType=(\w+)", &m)? m[1] : "MARKET", "^\s+|\s+$")
    ts       := RegExReplace(RegExMatch(content, "Timestamp=(\S+)", &m)? m[1] : "", "^\s+|\s+$")

    if (action = "")
        return

    ; Marquer comme PROCESSING avant d'agir
    newContent := StrReplace(content, "Status=PENDING", "Status=PROCESSING")
    FileDelete ORDER_FILE
    FileAppend newContent, ORDER_FILE, "UTF-8"

    ; Trouver Sierra Chart
    scWin := WinExist(SC_TITLE)
    if !scWin {
        LogOrder(ts, action, symbol, qty, "ERREUR — Sierra Chart non trouvé")
        MarkStatus("ERROR_SC_NOT_FOUND")
        return
    }

    WinActivate scWin
    Sleep 200

    ; Envoyer le raccourci selon l'action
    if (action = "BUY") {
        Send HOTKEY_BUY
        LogOrder(ts, action, symbol, qty, "ENVOYÉ " HOTKEY_BUY)
    } else if (action = "SELL") {
        Send HOTKEY_SELL
        LogOrder(ts, action, symbol, qty, "ENVOYÉ " HOTKEY_SELL)
    } else if (action = "FLATTEN") {
        Send HOTKEY_FLATTEN
        LogOrder(ts, action, symbol, qty, "ENVOYÉ " HOTKEY_FLATTEN)
    } else {
        LogOrder(ts, action, symbol, qty, "ACTION INCONNUE")
        MarkStatus("ERROR_UNKNOWN_ACTION")
        return
    }

    Sleep 300
    MarkStatus("DONE")
    TrayTip "SC Bridge", action " " qty " " symbol, 2
}

MarkStatus(status) {
    global ORDER_FILE
    if !FileExist(ORDER_FILE)
        return
    content := FileRead(ORDER_FILE, "UTF-8")
    content := RegExReplace(content, "Status=\w+", "Status=" status)
    FileDelete ORDER_FILE
    FileAppend content, ORDER_FILE, "UTF-8"
}

LogOrder(ts, action, symbol, qty, result) {
    logFile := "C:\SierraChart_CME\Data\sc_order_log.txt"
    line := ts " | " action " " qty " " symbol " → " result "`n"
    FileAppend line, logFile, "UTF-8"
}

; Quitter proprement avec Ctrl+Alt+Q
^!q:: {
    TrayTip "SC Bridge", "Arrêté", 2
    ExitApp
}
