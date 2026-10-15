import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, HEALTH_PATH, getHeaders, standardThresholds, profiles } from '../config.js';
import { buildSummary } from '../reporter.js';

export const options = { ...profiles.smoke, thresholds: standardThresholds };

export default function () {
  const res = http.get(`${BASE_URL}${HEALTH_PATH}`, getHeaders());
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response < 800ms': (r) => r.timings.duration < 800,
  });
  sleep(1);
}

export function handleSummary(data) { return buildSummary('smoke', data); }
