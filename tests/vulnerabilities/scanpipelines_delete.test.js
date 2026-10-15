import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { BASE_URL, setupWithUid, getStandardOptions } from '../../config.js';
import { generateDocHtml, generateDocMd, generateTerminalTable } from '../../reporter.js';

const apiDuration = new Trend('scanpipelines_delete_duration');
const apiSuccessRate = new Rate('scanpipelines_delete_success_rate');
const timeoutErrors = new Counter('timeout_errors');
const server5xxErrors = new Counter('server_5xx_errors');
const responseDataSize = new Trend('response_size_kb');

export const options = getStandardOptions('scanpipelines_delete_duration');

export function setup() {
  return setupWithUid('/api/v1/scanpipelines', 'SCAN_PIPELINE');
}

export default function (data) {
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${data.token}`,
      'Accept': 'application/json',
    },
    timeout: '15s',
    tags: { name: 'DELETE_ScanPipelines_ByID' },
  };

  group('DELETE /api/v1/scanpipelines/{uid}', () => {
    const res = http.del(`${BASE_URL}/api/v1/scanpipelines/${data.uid}`, null, params);

    apiDuration.add(res.timings.duration);
    responseDataSize.add((res.body ? res.body.length : 0) / 1024);

    if (res.status >= 500) server5xxErrors.add(1);
    if (res.status === 0 || res.timings.duration >= 14900) timeoutErrors.add(1);

    const isSuccess = check(res, {
      'status is 200 or 204': (r) => r.status === 200 || r.status === 204,
      'response time < 3000ms': (r) => r.timings.duration < 3000,
      'no 5xx error': (r) => r.status < 500,
    });

    apiSuccessRate.add(isSuccess);
  });

  sleep(1);
}

export function handleSummary(data) {
  const reportOpts = {
    groupName: '📑 ScanPipelines',
    apiTitle: 'SecGenie Delete Scan Pipeline API',
    apiEndpoint: '/api/v1/scanpipelines/{uid}',
    itemType: 'scan pipeline record',
    description: 'Performance test for deleting a Scan Pipeline by UID.',
  };

  return {
    'reports/vulnerabilities/scanpipelines_delete_report.html': generateDocHtml(data, reportOpts),
    'reports/vulnerabilities/scanpipelines_delete_report.md': generateDocMd(data, reportOpts),
    stdout: generateTerminalTable(data, reportOpts),
  };
}