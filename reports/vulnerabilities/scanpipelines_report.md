# SecGenie Scan Pipelines List API - Performance Test Report

## Test Summary
- **API Endpoint:** `/api/v1/scanpipelines`
- **Iterations:** 510
- **Average Response Time:** 2689.06 ms
- **P95 Response Time:** 15000.68 ms
- **Failure Rate:** 16.41% (84 out of 510)
- **Checks Passed:** 87.65% (1788 out of 2040)
- **Response Size:** 5.61 KB

## Why Issue Occurs (Root Cause & Error Analysis)
- Unpaginated Collection Fetch: Querying all scan pipeline records without pagination causes high memory overhead and response transfer delays.
- Complex Relational Joins: Multi-table SQL JOINs across tools, stages, and execution profiles under VU concurrency.

## How to Resolve (Optimization & Remediation Steps)
- Implement cursor-based or offset pagination (e.g. ?page=1&limit=20).
- Cache pipeline lists in Redis key scanpipelines:list.
- Add composite index on (tenant_id, is_active, created_at DESC).
