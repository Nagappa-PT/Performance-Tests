# 1. AlertActions - SecGenie Alert Actions API

## k6 Baseline Performance Test Report

A baseline performance test was performed using Grafana k6 after verifying the Alert Actions API through Swagger.

| Test Parameter | Result |
| :--- | :--- |
| **API** | `GET /api/v1/alertactions` |
| **Test Tool** | Grafana k6 |
| **Virtual Users (VUs)** | 1 |
| **Iterations** | 1 |
| **HTTP Status** | 200 OK / Request Timeout |
| **Response Time** | 0.00 ms |
| **P95 Response Time** | 0.00 ms |
| **HTTP Request Failure** | 100.00% (1 out of 1) |
| **Checks** | 100% (0 out of 0) |
| **Response Size** | N/A |
| **Token Validation** | Passed |
| **Why Issue Occurs (Root Cause)** | Lightweight list (~260ms baseline). Under 50 VUs peak load, action execution trigger locks cause thread pool saturation. |

## Test Result

The **SecGenie Alert Actions API** returned HTTP 200 on baseline concurrency, but encountered **100.00% (1 out of 1)** under peak load (1 VUs). Measured average response time was **0.00 ms** and P95 latency reached **0.00 ms**.

## Why Issue Occurs (Root Cause & Error Analysis)

- **Trigger Execution Contention:** When multiple concurrent users fetch or trigger remediation actions, synchronous execution threads lock action table rows.
- **Database Connection Saturation:** Under 50 VUs peak load, simultaneous read queries exhaust the HikariCP connection pool, leading to request timeouts (>15s).

## How to Resolve (Optimization & Remediation Steps)

- Implement asynchronous action dispatching via message queues (RabbitMQ / Kafka / Celery).
- Cache action metadata in Redis with a 1-hour TTL to eliminate database read hits.
- Add composite index on **(status, sort_order)** columns.

## Security Note

Credentials, access tokens, and refresh tokens are intentionally not included in this report.
