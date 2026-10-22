param([string]$DestinationDirectory = [Environment]::GetFolderPath('Desktop'))
$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path -Parent $PSScriptRoot
$shortcutPath = Join-Path $DestinationDirectory 'Demo-Manager.lnk'
if (Test-Path -LiteralPath $shortcutPath) {
    throw "Die Verknuepfung existiert bereits: $shortcutPath"
}
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
$shortcut.Arguments = '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "' + "$PSScriptRoot\start-desktop.ps1" + '"'
$shortcut.WorkingDirectory = $projectDirectory
$shortcut.Description = 'Demo-Manager in Google Chrome starten'
$shortcut.IconLocation = "$env:SystemRoot\System32\shell32.dll,16"
$shortcut.WindowStyle = 7
$shortcut.Save()
Write-Output "Desktop-Verknuepfung erstellt: $shortcutPath"
