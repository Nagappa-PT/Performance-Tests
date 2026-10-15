# SecGenie Scan Pipeline By ID API - Performance Test Report

## Test Summary
- **API Endpoint:** `/api/v1/scanpipelines/{uid}`
- **Iterations:** 1089
- **Average Response Time:** 276.37 ms
- **P95 Response Time:** 299.21 ms
- **Failure Rate:** 0.00% (0 out of 1089)
- **Checks Passed:** 100.00% (4356 out of 4356)
- **Response Size:** 1.33 KB

## Why Issue Occurs (Root Cause & Error Analysis)
- Unindexed UID Lookups: Fetching specific pipeline details without primary unique B-Tree index causes table scans.
- Connection Queue Wait Overhead: Database connection queues exhaust 15-second client timeouts under high traffic.

## How to Resolve (Optimization & Remediation Steps)
- Ensure unique index on scanpipelines.uid.
- Cache individual pipeline models in Redis using key scanpipeline:{uid}.
- Tune connection pool size (HikariCP maximum-pool-size: 50).
