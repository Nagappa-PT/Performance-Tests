import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, LIST_PATH, getHeaders, profiles } from '../config.js';
import { buildSummary } from '../reporter.js';

// Looser thresholds: goal is to find the breaking point
export const options = {
  ...profiles.stress,
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<2000'],
  },
};

export default function () {
  const res = http.get(`${BASE_URL}${LIST_PATH}`, getHeaders());
  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(1);
}

export function handleSummary(data) { return buildSummary('stress', data); }
