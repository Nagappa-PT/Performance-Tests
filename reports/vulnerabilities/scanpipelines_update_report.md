# SecGenie Update Scan Pipeline API - Performance Test Report

## Test Summary
- **API Endpoint:** `/api/v1/scanpipelines/{uid}`
- **Iterations:** 453
- **Average Response Time:** 3034.26 ms
- **P95 Response Time:** 15000.73 ms
- **Failure Rate:** 21.54% (98 out of 453)
- **Checks Passed:** 84.55% (1532 out of 1812)
- **Response Size:** 0.02 KB

## Why Issue Occurs (Root Cause & Error Analysis)
- Unindexed UID Lookups: Fetching specific pipeline details without primary unique B-Tree index causes table scans.
- Connection Queue Wait Overhead: Database connection queues exhaust 15-second client timeouts under high traffic.

## How to Resolve (Optimization & Remediation Steps)
- Ensure unique index on scanpipelines.uid.
- Cache individual pipeline models in Redis using key scanpipeline:{uid}.
- Tune connection pool size (HikariCP maximum-pool-size: 50).
