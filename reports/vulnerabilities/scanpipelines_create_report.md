# SecGenie Create Scan Pipeline API - Performance Test Report

## Test Summary
- **API Endpoint:** `/api/v1/scanpipelines`
- **Iterations:** 1064
- **Average Response Time:** 303.27 ms
- **P95 Response Time:** 342.41 ms
- **Failure Rate:** 99.81% (1064 out of 1064)
- **Checks Passed:** 75.00% (3192 out of 4256)
- **Response Size:** 0.12 KB

## Why Issue Occurs (Root Cause & Error Analysis)
- Unpaginated Collection Fetch: Querying all scan pipeline records without pagination causes high memory overhead and response transfer delays.
- Complex Relational Joins: Multi-table SQL JOINs across tools, stages, and execution profiles under VU concurrency.

## How to Resolve (Optimization & Remediation Steps)
- Implement cursor-based or offset pagination (e.g. ?page=1&limit=20).
- Cache pipeline lists in Redis key scanpipelines:list.
- Add composite index on (tenant_id, is_active, created_at DESC).
