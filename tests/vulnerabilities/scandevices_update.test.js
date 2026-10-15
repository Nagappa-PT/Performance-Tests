import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { BASE_URL, setupWithUid, getStandardOptions } from '../../config.js';
import { generateDocHtml, generateDocMd, generateTerminalTable } from '../../reporter.js';

const apiDuration = new Trend('scandevices_update_duration');
const apiSuccessRate = new Rate('scandevices_update_success_rate');
const timeoutErrors = new Counter('timeout_errors');
const server5xxErrors = new Counter('server_5xx_errors');
const responseDataSize = new Trend('response_size_kb');

export const options = getStandardOptions('scandevices_update_duration');

export function setup() {
  return setupWithUid('/api/v1/scandevices', 'SCAN_DEVICE');
}

export default function (data) {
  const payload = JSON.stringify({
    name: `Updated_ScanDevice_${data.uid}`,
    ip_address: '192.168.1.101',
    status: 'UPDATED',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${data.token}`,
      'Accept': 'application/json',
    },
    timeout: '15s',
    tags: { name: 'PUT_ScanDevices_ByID' },
  };

  group('PUT /api/v1/scandevices/{uid}', () => {
    const res = http.put(`${BASE_URL}/api/v1/scandevices/${data.uid}`, payload, params);

    apiDuration.add(res.timings.duration);
    responseDataSize.add((res.body ? res.body.length : 0) / 1024);

    if (res.status >= 500) server5xxErrors.add(1);
    if (res.status === 0 || res.timings.duration >= 14900) timeoutErrors.add(1);

    const isSuccess = check(res, {
      'status is 200': (r) => r.status === 200,
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
    apiTitle: 'SecGenie Update Scan Device API',
    apiEndpoint: 'PUT /api/v1/scandevices/{uid}',
    itemType: 'scan device record',
    description: 'Performance test for updating an existing Scan Device by UID.',
  };

  return {
    'reports/vulnerabilities/scandevices_update_report.html': generateDocHtml(data, reportOpts),
    'reports/vulnerabilities/scandevices_update_report.md': generateDocMd(data, reportOpts),
    stdout: generateTerminalTable(data, reportOpts),
  };
}