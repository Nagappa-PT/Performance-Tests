import http from 'k6/http';

// =========================================================================
// Load .env Configuration
// =========================================================================
let fileEnv = {};
try {
  const envContent = open('./.env');
  envContent.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        fileEnv[trimmed.substring(0, idx).trim()] = trimmed.substring(idx + 1).trim();
      }
    }
  });
} catch (e) {}

// Base Configuration
export const BASE_URL = __ENV.SECGENIE_BASE_URL || fileEnv.SECGENIE_BASE_URL;
export const USERNAME = __ENV.SECGENIE_USERNAME || fileEnv.SECGENIE_USERNAME;
export const PASSWORD = __ENV.SECGENIE_PASSWORD || fileEnv.SECGENIE_PASSWORD;

// =========================================================================
// API Endpoints & Paths
// =========================================================================
export const HEALTH_PATH = '/api/v1/health';
export const ALERTS_PATH = '/api/v1/alerts';
export const ALERTRULES_PATH = '/api/v1/alertrules';
export const COMPLIANCE_PATH = '/api/v1/compliance';
export const EXPOSURES_PATH = '/api/v1/exposures';
export const INCIDENTS_PATH = '/api/v1/incidents';
export const SCANDEVICES_PATH = '/api/v1/scandevices';
export const SCANPIPELINES_PATH = '/api/v1/scanpipelines';

// =========================================================================
// Threshold Definitions
// =========================================================================
export const standardThresholds = {
  http_req_duration: ['p(95)<3000', 'p(99)<5000'],
  http_req_failed: ['rate<0.05'],
};

export const smokeThresholds = {
  http_req_duration: ['p(95)<1000'],
  http_req_failed: ['rate<0.01'],
};

export const thresholds = standardThresholds;

// =========================================================================
// Helper Functions
// =========================================================================
export function getHeaders(token = null) {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// =========================================================================
// Test Options Configurations
// =========================================================================
export function getStandardOptions(metricName = 'http_req_duration') {
  return {
    insecureSkipTLSVerify: true,
    stages: [
      { duration: '10s', target: 5 },   // Ramp-up
      { duration: '15s', target: 10 },  // Normal load
      { duration: '15s', target: 25 },  // Medium load
      { duration: '20s', target: 50 },  // Peak load
      { duration: '10s', target: 0 },   // Cooldown
    ],
    summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
    thresholds: standardThresholds,
  };
}

export function getSmokeOptions() {
  return {
    insecureSkipTLSVerify: true,
    vus: 1,
    duration: '10s',
    thresholds: smokeThresholds,
  };
}

// =========================================================================
// Dynamic OAuth Authentication
// =========================================================================
export function authenticate() {
  if (!BASE_URL || !USERNAME || !PASSWORD) {
    throw new Error('❌ Missing credentials in .env file!');
  }

  const loginUrl = `${BASE_URL}/api/v1/oauth/authenticate`;
  let lastError = null;
  let lastStatus = 0;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = http.post(
        loginUrl,
        JSON.stringify({ username: USERNAME, password: PASSWORD }),
        {
          headers: getHeaders(),
          timeout: '25s',
          insecureSkipTLSVerify: true,
        }
      );

      lastStatus = res.status;
      if (res.status === 200) {
        const body = res.json();
        const token = body.token || body.accessToken || body.access_token;
        if (token) return token;
      }
    } catch (e) {
      lastError = e;
    }
  }

  throw new Error(`❌ Login failed with HTTP status: ${lastStatus}${lastError ? ' (' + lastError.message + ')' : ''}`);
}

// =========================================================================
// Setup Helper: Login + Dynamic UID Fetch
// =========================================================================
export function setupWithUid(listEndpoint, fallbackUid = 'DEFAULT_UID') {
  const token = authenticate();
  let uid = fallbackUid;
  let alertUid = 'DEFAULT_ALERT_UID';

  try {
    const res = http.get(`${BASE_URL}${listEndpoint}`, {
      headers: getHeaders(token),
      timeout: '15s',
      insecureSkipTLSVerify: true,
    });

    if (res.status === 200) {
      const json = res.json();
      const list = Array.isArray(json)
        ? json
        : (json.result || json.data || json.content || json.items || []);
      
      if (list && list.length > 0) {
        const item = list[0];
        uid = item.uid || item.id || item.uuid || item.device_uid || item.pipeline_uid || fallbackUid;
      }
    }
  } catch (e) {
    uid = fallbackUid;
  }

  if (listEndpoint.includes('alertrules') || listEndpoint.includes('alerts')) {
    try {
      const alertRes = http.get(`${BASE_URL}/api/v1/alerts`, {
        headers: getHeaders(token),
        timeout: '15s',
        insecureSkipTLSVerify: true,
      });
      if (alertRes.status === 200) {
        const aJson = alertRes.json();
        const aList = Array.isArray(aJson)
          ? aJson
          : (aJson.result || aJson.data || aJson.content || aJson.items || []);
        if (aList && aList.length > 0) {
          alertUid = aList[0].uid || aList[0].id || 'DEFAULT_ALERT_UID';
        }
      }
    } catch (e) {}
  }

  return { token, uid, alertUid };
}