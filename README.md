# k6 Performance Tests

## 1. Install k6 (Windows)
    winget install k6 --source winget
    k6 version

## 2. Configure
Edit `.env` -> set BASE_URL (and API_TOKEN if needed).
Edit `LIST_PATH` / `HEALTH_PATH` to real endpoints of your app.

## 3. Run
    .\run_smoke_tests.ps1                 # quick sanity check (1 user, 30s)
    .\run_test.ps1 -Test load             # normal expected traffic
    .\run_test.ps1 -Test stress           # find the breaking point
    .\run_test.ps1 -Test spike            # sudden traffic burst
    .\run_all_tests.ps1                   # everything

If PowerShell blocks scripts:
    Set-ExecutionPolicy -Scope Process Bypass

## 4. Results
HTML + JSON reports are written to `reports/` (e.g. reports/load.html).

## Test types
| Test   | Purpose                                  |
|--------|------------------------------------------|
| smoke  | Does the script/app work at all?         |
| load   | Behaviour under normal traffic           |
| stress | Where does it start to fail?             |
| spike  | Recovery after a sudden surge            |

## Thresholds (config.js)
Fail the run if errors >= 1%, p95 >= 800ms, or p99 >= 1500ms.
