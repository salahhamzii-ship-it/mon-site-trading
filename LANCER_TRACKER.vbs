Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

Dim base
base = WshShell.ExpandEnvironmentStrings("%USERPROFILE%") & "\Desktop\sc-bridge"

' --- Tuer ancienne instance Node ---
WshShell.Run "taskkill /F /IM node.exe", 0, False
WshShell.Sleep 1000

' --- Installer ws si absent ---
If Not fso.FolderExists(base & "\node_modules\ws") Then
    WshShell.Run "cmd /c npm install ws --save --prefix """ & base & """", 0, True
End If

' --- Démarrer bridge Node silencieusement ---
WshShell.Run "cmd /c node """ & base & "\sc_bridge.js"" > """ & base & "\sc_bridge.log"" 2>&1", 0, False

' --- Attendre que le bridge soit prêt ---
WshShell.Sleep 3000

' --- Ouvrir le tracker dans le navigateur par défaut ---
Dim html
html = base & "\suivi_sd_nq.html"
WshShell.Run """" & html & """", 1, False
