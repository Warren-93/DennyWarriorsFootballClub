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
export function getAuthToken() {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(AUTH_TOKEN_KEY) || '';
}

export function setAuthToken(token) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
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

export async function request(path, options = {}) {
  const token = getAuthToken();
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

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `API request failed with status ${response.status}`);
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
    const message = await response.text();
    throw new Error(message || `Login failed with status ${response.status}`);
  }

  const payload = await parseResponse(response);
  const token = extractToken(payload);

  if (!token) {
    throw new Error('Login succeeded but no JWT token was returned.');
  }

  setAuthToken(token);
  return payload;
}
