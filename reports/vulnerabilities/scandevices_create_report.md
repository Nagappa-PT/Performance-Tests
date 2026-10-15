# SecGenie Create Scan Device API - Performance Test Report

## Test Summary
- **API Endpoint:** `/api/v1/scandevices`
- **Iterations:** 540
- **Average Response Time:** 2414.01 ms
- **P95 Response Time:** 15000.62 ms
- **Failure Rate:** 99.63% (540 out of 540)
- **Checks Passed:** 67.87% (1466 out of 2160)
- **Response Size:** 0.20 KB

## Why Issue Occurs (Root Cause & Error Analysis)
- Unpaginated Collection Fetch: Querying all scan device records without explicit pagination can cause memory overhead and response payload latency under scale.
- Connection Pool Exhaustion: Concurrent requests holding open DB connections during long scan result aggregations.

## How to Resolve (Optimization & Remediation Steps)
- Implement cursor-based or offset pagination (e.g. ?page=1&limit=50).
- Cache total scan device lists in Redis with periodic eviction strategies.
- Add indices for frequently sorted/filtered fields such as status or created_at.
