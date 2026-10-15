# SecGenie Update Scan Device API - Performance Test Report

## Test Summary
- **API Endpoint:** `PUT /api/v1/scandevices/{uid}`
- **Iterations:** 489
- **Average Response Time:** 2857.64 ms
- **P95 Response Time:** 15000.63 ms
- **Failure Rate:** 19.55% (96 out of 489)
- **Checks Passed:** 85.89% (1680 out of 1956)
- **Response Size:** 0.01 KB

## Why Issue Occurs (Root Cause & Error Analysis)
- High Concurrency Contention: Heavy traffic leading to database thread pool exhaustion and resource bottlenecks.
- Unoptimized Query Execution: Absence of composite indexes leading to elevated latency.

## How to Resolve (Optimization & Remediation Steps)
- Optimize database queries and ensure appropriate index coverage.
- Implement caching layer (Redis / In-Memory) to decrease database load.
- Tune API thread pools and database connection parameters.
