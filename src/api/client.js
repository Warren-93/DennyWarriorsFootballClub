const LOCAL_API_BASE_URL = 'http://localhost:8080/api/v1';
const API_PATH = '/api/v1';

function getRuntimeApiBaseUrl() {
  if (typeof window === 'undefined') return '';
  return window.__DWFC_CONFIG__?.API_BASE_URL || '';
}

function getDefaultApiBaseUrl() {
  if (typeof window === 'undefined') {
    return process.env.NODE_ENV === 'production'
      ? API_PATH
      : LOCAL_API_BASE_URL;
  }

  const hostname = window.location.hostname;
  const isLocalhost =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0';

  if (isLocalhost) {
    return LOCAL_API_BASE_URL;
  }

  return `${window.location.origin}${API_PATH}`;
}

const API_BASE_URL =
  getRuntimeApiBaseUrl() ||
  process.env.REACT_APP_API_URL ||
  getDefaultApiBaseUrl();

export const AUTH_TOKEN_KEY = 'dwfc_token';
export const REFRESH_TOKEN_KEY = 'dwfc_refresh_token';

export function getAuthToken() {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(AUTH_TOKEN_KEY) || '';
}

export function getRefreshToken() {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(REFRESH_TOKEN_KEY) || '';
}

function setRefreshToken(token) {
  if (typeof window === 'undefined') return;
  if (token) window.localStorage.setItem(REFRESH_TOKEN_KEY, token);
  else window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

// Reads a JWT's claims (role, exp...) without verifying it. Only used to
// decide what to show and when to refresh: the API verifies every token.
export function decodeTokenClaims(token) {
  if (!token) return null;
  try {
    const segment = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(segment.padEnd(segment.length + ((4 - (segment.length % 4)) % 4), '=')));
  } catch {
    return null;
  }
}

// Treat a token as expired a minute early, so it can't run out mid-request.
const EXPIRY_MARGIN_MS = 60 * 1000;

export function isTokenExpired(token) {
  const exp = decodeTokenClaims(token)?.exp;
  return typeof exp !== 'number' || exp * 1000 - EXPIRY_MARGIN_MS <= Date.now();
}

// True while the admin can still make authenticated requests: the access
// token is valid, or it has expired but the refresh token can renew it.
export function hasSession() {
  return !isTokenExpired(getAuthToken()) || !isTokenExpired(getRefreshToken());
}

export function setAuthToken(token) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

// The API answers errors with JSON like { status, error, message, path }.
// Show its message rather than the raw JSON text.
export async function readErrorMessage(response, fallback) {
  const text = await response.text().catch(() => '');
  try {
    const body = JSON.parse(text);
    if (body?.message) return body.message;
  } catch {
    // Not JSON (e.g. a proxy's HTML error page): fall through.
  }
  return text && text.length < 200 && !text.trim().startsWith('<') ? text : fallback;
}

// One refresh at a time: requests that need a new access token together all
// wait for the same refresh instead of each spending the refresh token.
let refreshInFlight = null;

function refreshAccessToken() {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const response = await fetch(buildApiUrl('/auth/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: getRefreshToken() }),
      }).catch(() => null);

      if (!response || !response.ok) {
        clearAuthToken();
        throw new Error('Your session has expired. Please log in again.');
      }
      const { accessToken } = await response.json();
      setAuthToken(accessToken);
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

// The access token to send with a request, renewed first if it has expired
// and a refresh token is available. Empty when not logged in.
export async function getValidAuthToken() {
  const token = getAuthToken();
  if (token && isTokenExpired(token) && getRefreshToken()) {
    await refreshAccessToken();
    return getAuthToken();
  }
  return token;
}

export function buildApiUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

async function parseResponse(response) {
  if (response.status === 204) return null;

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
}

export async function request(path, options = {}, retried = false) {
  const token = await getValidAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(buildApiUrl(path), {
    ...options,
    headers,
  });

  // A 401 despite a fresh-looking token (e.g. the server's clock disagrees):
  // refresh once and retry.
  if (response.status === 401 && token && getRefreshToken() && !retried) {
    await refreshAccessToken();
    return request(path, options, true);
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `API request failed with status ${response.status}`));
  }

  return parseResponse(response);
}

// The backend wraps list endpoints as { data, page, size, totalElements }.
// This unwraps to the plain array the pages expect, and passes non-enveloped
// payloads (single objects, null from a 204) straight through unchanged.
export function unwrapList(payload) {
  if (payload && Array.isArray(payload.data)) return payload.data;
  return payload;
}

// Build a query string from a params object. Skips undefined/null/'' values.
export function buildQuery(params) {
  if (!params) return '';
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ''
  );
  if (entries.length === 0) return '';
  return `?${new URLSearchParams(entries)}`;
}

function extractToken(payload) {
  if (!payload) return '';
  if (typeof payload === 'string') return payload;

  return (
    payload.token ||
    payload.jwt ||
    payload.accessToken ||
    payload.access_token ||
    payload?.data?.token ||
    payload?.data?.jwt ||
    payload?.data?.accessToken ||
    payload?.data?.access_token ||
    ''
  );
}

export async function loginAdmin(
  credentials,
  loginPath = process.env.REACT_APP_ADMIN_LOGIN_PATH || '/auth/login'
) {
  const response = await fetch(buildApiUrl(loginPath), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Incorrect username or password.');
    throw new Error(await readErrorMessage(response, `Login failed with status ${response.status}`));
  }

  const payload = await parseResponse(response);
  const token = extractToken(payload);

  if (!token) {
    throw new Error('Login succeeded but no JWT token was returned.');
  }

  setAuthToken(token);
  // Kept so the access token can be renewed instead of logging the admin out.
  setRefreshToken(payload?.refreshToken || '');
  return payload;
}
