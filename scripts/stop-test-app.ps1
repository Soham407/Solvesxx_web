$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$pidPath = Join-Path $root ".test-app.pid"

if (-not (Test-Path $pidPath)) {
  Write-Output "No tracked test app is running."
  exit 0
}

$appPid = Get-Content $pidPath
$process = Get-Process -Id $appPid -ErrorAction SilentlyContinue

if ($process) {
  taskkill /PID $appPid /T /F *> $null
  Write-Output "Stopped test app pid $appPid."
} else {
  Write-Output "Tracked test app pid $appPid is already gone."
}

Remove-Item $pidPath -Force -ErrorAction SilentlyContinue
