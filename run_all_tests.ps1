# Runs smoke -> load -> stress -> spike, stops if smoke fails
Set-Location $PSScriptRoot
.\run_test.ps1 -Test smoke
if ($LASTEXITCODE -ne 0) { Write-Host "Smoke test failed. Stopping." -ForegroundColor Red; exit 1 }
foreach ($t in 'load','stress','spike') { .\run_test.ps1 -Test $t }
Write-Host "Done. Open the HTML files in the reports folder." -ForegroundColor Green
