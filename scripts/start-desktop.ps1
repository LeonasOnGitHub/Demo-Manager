param([switch]$CheckOnly)
$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path -Parent $PSScriptRoot
$appUrl = 'http://127.0.0.1:5173'

function Test-DemoManager {
    try {
        $response = Invoke-WebRequest -Uri $appUrl -UseBasicParsing -TimeoutSec 2
        if ($response.Content -notmatch '<title>Demo Manager') {
            throw 'Port 5173 wird bereits von einer anderen Anwendung verwendet.'
        }
        return $true
    } catch [System.Net.WebException] {
        if ($_.Exception.Response) { throw 'Port 5173 wird bereits von einer anderen Anwendung verwendet.' }
        return $false
    }
}

try {
    $chrome = @(
        "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
        "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
        "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
    ) | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
    if (-not $chrome) { throw 'Google Chrome wurde nicht gefunden.' }
    if (-not (Test-DemoManager)) {
        if (-not (Test-Path -LiteralPath "$projectDirectory\dist\index.html")) {
            throw 'Der App-Build fehlt. Bitte im Projektordner npm run build ausfuehren.'
        }
        $node = (Get-Command node.exe -ErrorAction Stop).Source
        Start-Process -FilePath $node -ArgumentList ('"' + "$PSScriptRoot\desktop-server.mjs" + '"') -WorkingDirectory $projectDirectory -WindowStyle Hidden
        $ready = $false
        for ($attempt = 0; $attempt -lt 20; $attempt++) {
            Start-Sleep -Milliseconds 250
            if (Test-DemoManager) { $ready = $true; break }
        }
        if (-not $ready) { throw 'Der lokale Demo-Manager konnte nicht gestartet werden.' }
    }
    if ($CheckOnly) { Write-Output "Demo-Manager bereit: $appUrl"; exit 0 }
    Start-Process -FilePath $chrome -ArgumentList "--app=$appUrl" -WindowStyle Normal
} catch {
    if ($CheckOnly) { Write-Error $_; exit 1 }
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, 'Demo-Manager konnte nicht starten', 'OK', 'Error') | Out-Null
    exit 1
}
