# SecGenie Delete Scan Pipeline API - Performance Test Report

## Test Summary
- **API Endpoint:** `/api/v1/scanpipelines/{uid}`
- **Iterations:** 1068
- **Average Response Time:** 297.85 ms
- **P95 Response Time:** 357.06 ms
- **Failure Rate:** 99.72% (1067 out of 1068)
- **Checks Passed:** 66.70% (2137 out of 3204)
- **Response Size:** 0.12 KB

## Why Issue Occurs (Root Cause & Error Analysis)
- Unindexed UID Lookups: Fetching specific pipeline details without primary unique B-Tree index causes table scans.
- Connection Queue Wait Overhead: Database connection queues exhaust 15-second client timeouts under high traffic.

## How to Resolve (Optimization & Remediation Steps)
- Ensure unique index on scanpipelines.uid.
- Cache individual pipeline models in Redis using key scanpipeline:{uid}.
- Tune connection pool size (HikariCP maximum-pool-size: 50).
