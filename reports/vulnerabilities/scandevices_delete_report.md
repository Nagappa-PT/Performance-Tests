# SecGenie Delete Scan Device API - Performance Test Report

## Test Summary
- **API Endpoint:** `DELETE /api/v1/scandevices/{uid}`
- **Iterations:** 600
- **Average Response Time:** 1492.40 ms
- **P95 Response Time:** 15000.23 ms
- **Failure Rate:** 99.50% (599 out of 600)
- **Checks Passed:** 63.94% (1151 out of 1800)
- **Response Size:** 0.11 KB

## Why Issue Occurs (Root Cause & Error Analysis)
- High Concurrency Contention: Heavy traffic leading to database thread pool exhaustion and resource bottlenecks.
- Unoptimized Query Execution: Absence of composite indexes leading to elevated latency.

## How to Resolve (Optimization & Remediation Steps)
- Optimize database queries and ensure appropriate index coverage.
- Implement caching layer (Redis / In-Memory) to decrease database load.
- Tune API thread pools and database connection parameters.
