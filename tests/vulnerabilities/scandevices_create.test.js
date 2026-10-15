import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { BASE_URL, setupWithUid, getStandardOptions } from '../../config.js';
import { generateDocHtml, generateDocMd, generateTerminalTable } from '../../reporter.js';

const apiDuration = new Trend('scandevices_create_duration');
const apiSuccessRate = new Rate('scandevices_create_success_rate');
const timeoutErrors = new Counter('timeout_errors');
const server5xxErrors = new Counter('server_5xx_errors');
const responseDataSize = new Trend('response_size_kb');

export const options = getStandardOptions('scandevices_create_duration');

export function setup() {
  return setupWithUid('/api/v1/scandevices', 'SCAN_DEVICE');
}

export default function (data) {
  const payload = JSON.stringify({
    name: `Test_ScanDevice_${Date.now()}`,
    ip_address: '192.168.1.100',
    device_type: 'SCANNER',
    status: 'ACTIVE',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${data.token}`,
      'Accept': 'application/json',
    },
    timeout: '15s',
    tags: { name: 'POST_ScanDevices' },
  };

  group('POST /api/v1/scandevices', () => {
    const res = http.post(`${BASE_URL}/api/v1/scandevices`, payload, params);

    apiDuration.add(res.timings.duration);
    responseDataSize.add((res.body ? res.body.length : 0) / 1024);

    if (res.status >= 500) server5xxErrors.add(1);
    if (res.status === 0 || res.timings.duration >= 14900) timeoutErrors.add(1);

    const isSuccess = check(res, {
      'status is 200 or 201': (r) => r.status === 200 || r.status === 201,
      'response time < 3000ms': (r) => r.timings.duration < 3000,
      'no 5xx error': (r) => r.status < 500,
      'valid json response': (r) => {
        try {
          const j = r.json();
          return j !== null && typeof j === 'object';
        } catch (e) { return false; }
      },
    });

    apiSuccessRate.add(isSuccess);
  });

  sleep(1);
}

export function handleSummary(data) {
  const reportOpts = {
    groupName: '📑 ScanDevices',
    apiTitle: 'SecGenie Create Scan Device API',
    apiEndpoint: '/api/v1/scandevices',
    itemType: 'scan device record',
    description: 'Performance test for creating a new Scan Device.',
  };

  return {
    'reports/vulnerabilities/scandevices_create_report.html': generateDocHtml(data, reportOpts),
    'reports/vulnerabilities/scandevices_create_report.md': generateDocMd(data, reportOpts),
    stdout: generateTerminalTable(data, reportOpts),
  };
}