# Usage: .\run_test.ps1 -Test smoke|load|stress|spike
param([Parameter(Mandatory=$true)][ValidateSet('smoke','load','stress','spike')][string]$Test)

Set-Location $PSScriptRoot
New-Item -ItemType Directory -Force -Path reports | Out-Null

# Load .env into environment variables so k6 can read them via __ENV
if (Test-Path .env) {
  Get-Content .env | ForEach-Object {
    if ($_ -match '^\s*([^#=\s]+)\s*=\s*(.*)\s*$') {
      [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
    }
  }
}

Write-Host "Running $Test test against $env:BASE_URL ..." -ForegroundColor Cyan
k6 run "tests/$Test.test.js"
