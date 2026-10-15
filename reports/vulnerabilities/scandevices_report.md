# SecGenie Scan Devices List API - Performance Test Report

## Test Summary
- **API Endpoint:** `/api/v1/scandevices`
- **Iterations:** 1095
- **Average Response Time:** 261.81 ms
- **P95 Response Time:** 269.97 ms
- **Failure Rate:** 0.00% (0 out of 1095)
- **Checks Passed:** 100.00% (4380 out of 4380)
- **Response Size:** 0.22 KB

## Why Issue Occurs (Root Cause & Error Analysis)
- Unpaginated Collection Fetch: Querying all scan device records without explicit pagination can cause memory overhead and response payload latency under scale.
- Connection Pool Exhaustion: Concurrent requests holding open DB connections during long scan result aggregations.

## How to Resolve (Optimization & Remediation Steps)
- Implement cursor-based or offset pagination (e.g. ?page=1&limit=50).
- Cache total scan device lists in Redis with periodic eviction strategies.
- Add indices for frequently sorted/filtered fields such as status or created_at.
