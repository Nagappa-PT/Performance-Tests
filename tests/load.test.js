import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend } from 'k6/metrics';
import { BASE_URL, HEALTH_PATH, LIST_PATH, getHeaders, standardThresholds, profiles } from '../config.js';
import { buildSummary } from '../reporter.js';

const listDuration = new Trend('list_endpoint_duration', true);

export const options = { ...profiles.load, thresholds: standardThresholds };

export default function () {
  group('home / health', () => {
    const res = http.get(`${BASE_URL}${HEALTH_PATH}`, getHeaders());
    check(res, { 'health 200': (r) => r.status === 200 });
  });

  group('list endpoint', () => {
    const res = http.get(`${BASE_URL}${LIST_PATH}`, getHeaders());
    listDuration.add(res.timings.duration);
    check(res, { 'list 200': (r) => r.status === 200 });
  });

  sleep(Math.random() * 2 + 1); // think time 1-3s
}

export function handleSummary(data) { return buildSummary('load', data); }
