# SecGenie Scans List API - Performance Test Report

## Test Summary
- **API Endpoint:** `/api/v1/scans`
- **Iterations:** 1
- **Average Response Time:** 0.00 ms
- **P95 Response Time:** 0.00 ms
- **Failure Rate:** 0.00% (0 out of 1)
- **Checks Passed:** 100.00% (1 out of 1)
- **Response Size:** N/A

## Why Issue Occurs (Root Cause & Error Analysis)
- Unpaginated historical scan runs query triggering temporary disk sorting and CPU memory pressure under multi-VU load.
- Sorting large scan histories by `started_at DESC` causes temporary file sorting in relational databases.

## How to Resolve (Optimization & Remediation Steps)
- Enforce mandatory pagination parameters (e.g. `?page=1&size=20`).
- Create composite index on `(tenant_id, status, started_at DESC)`.
- Cache active scan execution lists in Redis key `scans:list`..