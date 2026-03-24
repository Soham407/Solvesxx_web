$ErrorActionPreference = "Stop"

$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location $root

$pidPath = Join-Path $root ".test-app.pid"
$hostName = if ($env:TEST_APP_HOST) { $env:TEST_APP_HOST } else { "127.0.0.1" }
$port = if ($env:TEST_APP_PORT) { $env:TEST_APP_PORT } else { "3000" }
$baseUrl = "http://${hostName}:$port"

if (Test-Path $pidPath) {
  $existingPid = Get-Content $pidPath
  $existingProcess = Get-Process -Id $existingPid -ErrorAction SilentlyContinue

  if ($existingProcess) {
    try {
      Invoke-WebRequest -UseBasicParsing "$baseUrl/login" -TimeoutSec 5 | Out-Null
      Write-Output "Test app already running at $baseUrl (pid $existingPid)."
      exit 0
    } catch {
      taskkill /PID $existingPid /T /F *> $null
    }
  }

  Remove-Item $pidPath -Force -ErrorAction SilentlyContinue
}

$escapedRoot = $root.Replace("'", "''")
$command = "cd '$escapedRoot'; `$env:PORT='$port'; npm run start -- --hostname $hostName"
$process = Start-Process `
  -FilePath "C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe" `
  -ArgumentList "-NoProfile", "-Command", $command `
  -PassThru

Set-Content $pidPath $process.Id

for ($attempt = 0; $attempt -lt 90; $attempt += 1) {
  try {
    Invoke-WebRequest -UseBasicParsing "$baseUrl/login" -TimeoutSec 5 | Out-Null
    Write-Output "Started test app at $baseUrl (pid $($process.Id))."
    exit 0
  } catch {}

  if ($process.HasExited) {
    Remove-Item $pidPath -Force -ErrorAction SilentlyContinue
    throw "The test app exited before it became ready."
  }

  Start-Sleep -Seconds 2
}

taskkill /PID $process.Id /T /F *> $null
Remove-Item $pidPath -Force -ErrorAction SilentlyContinue
throw "Timed out waiting for the test app at $baseUrl."
