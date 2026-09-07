Set WshShell = CreateObject("WScript.Shell")
Dim bat
bat = WshShell.ExpandEnvironmentStrings("%USERPROFILE%") & "\Desktop\sc-bridge\startup_bridge.bat"
WshShell.Run """" & bat & """", 0, False
