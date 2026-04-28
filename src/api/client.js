const LOCAL_API_BASE_URL = 'http://localhost:8080/api/dennywarriors';
const API_PATH = '/api/dennywarriors';

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
export const LOCAL_ADMIN_USERNAME_KEY = 'dwfc_admin_username';
export const LOCAL_ADMIN_PASSWORD_KEY = 'dwfc_admin_password';

const LOCAL_ADMIN_DEFAULTS = {
  username: process.env.REACT_APP_LOCAL_ADMIN_USERNAME || 'admin',
  password: process.env.REACT_APP_LOCAL_ADMIN_PASSWORD || 'warriors123',
};

export function isLocalAdminAuthEnabled() {
  return process.env.NODE_ENV !== 'production';
}

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

export function ensureLocalAdminCredentials() {
  if (typeof window === 'undefined' || !isLocalAdminAuthEnabled()) {
    return null;
  }

  const storedUsername = window.localStorage.getItem(LOCAL_ADMIN_USERNAME_KEY);
  const storedPassword = window.localStorage.getItem(LOCAL_ADMIN_PASSWORD_KEY);

  if (!storedUsername) {
    window.localStorage.setItem(LOCAL_ADMIN_USERNAME_KEY, LOCAL_ADMIN_DEFAULTS.username);
  }

  if (!storedPassword) {
    window.localStorage.setItem(LOCAL_ADMIN_PASSWORD_KEY, LOCAL_ADMIN_DEFAULTS.password);
  }

  return {
    username: window.localStorage.getItem(LOCAL_ADMIN_USERNAME_KEY) || LOCAL_ADMIN_DEFAULTS.username,
    password: window.localStorage.getItem(LOCAL_ADMIN_PASSWORD_KEY) || LOCAL_ADMIN_DEFAULTS.password,
  };
}

export function loginWithLocalAdmin(username, password) {
  const credentials = ensureLocalAdminCredentials();

  if (!credentials) {
    return false;
  }

  if (username === credentials.username && password === credentials.password) {
    setAuthToken('dwfc-local-dev-token');
    return true;
  }

  return false;
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
