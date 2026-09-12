' send_csv_silent.vbs — Lance send_csv.bat en arrière-plan (aucune fenêtre)
Set WShell = CreateObject("WScript.Shell")
ScriptDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
WShell.Run Chr(34) & ScriptDir & "\send_csv.bat" & Chr(34), 0, False
