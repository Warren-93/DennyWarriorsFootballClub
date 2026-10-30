import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AUTH_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  clearAuthToken,
  getAuthToken,
  hasSession,
  loginAdmin,
  request,
} from './client';
import { uploadMedia } from './media';
import { fakeToken } from '../test/tokens';

const json = (status, body) => new Response(body === undefined ? null : JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
});

function signIn(accessToken, refreshToken) {
  localStorage.setItem(AUTH_TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

const callsTo = (suffix) => fetch.mock.calls.filter(([url]) => url.endsWith(suffix));

describe('api client', () => {
  beforeEach(() => {
    clearAuthToken();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('login keeps the refresh token as well as the access token', async () => {
    const access = fakeToken();
    const refresh = fakeToken({ type: 'refresh', expiresInSeconds: 604800 });
    fetch.mockResolvedValueOnce(json(200, { accessToken: access, refreshToken: refresh, username: 'editor', role: 'EDITOR' }));

    await loginAdmin({ username: 'editor', password: 'pw' });

    expect(localStorage.getItem(AUTH_TOKEN_KEY)).toBe(access);
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBe(refresh);
  });

  it('login says plainly when the details are wrong', async () => {
    fetch.mockResolvedValueOnce(json(401, { status: 401, message: 'Invalid credentials' }));

    await expect(loginAdmin({ username: 'x', password: 'y' })).rejects.toThrow('Incorrect username or password.');
  });

  it('shows the API message instead of the raw JSON error body', async () => {
    fetch.mockResolvedValueOnce(json(404, { timestamp: '2026-01-01T00:00:00', status: 404, error: 'Not Found', message: 'Article not found: x', path: '/api/v1/news/x' }));

    await expect(request('/news/x')).rejects.toThrow(/^Article not found: x$/);
  });

  it('renews an expired access token before the request, instead of logging the admin out', async () => {
    signIn(fakeToken({ expiresInSeconds: -60 }), 'refresh-1');
    const fresh = fakeToken();
    fetch
      .mockResolvedValueOnce(json(200, { accessToken: fresh }))
      .mockResolvedValueOnce(json(200, { data: [] }));

    await expect(request('/admin/news')).resolves.toEqual({ data: [] });

    expect(fetch.mock.calls[0][0]).toMatch(/\/auth\/refresh$/);
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ refreshToken: 'refresh-1' });
    expect(fetch.mock.calls[1][1].headers.Authorization).toBe(`Bearer ${fresh}`);
    expect(getAuthToken()).toBe(fresh);
  });

  it('does not refresh while the access token is still valid', async () => {
    signIn(fakeToken(), 'refresh-1');
    fetch.mockResolvedValueOnce(json(200, { data: [] }));

    await request('/admin/news');

    expect(callsTo('/auth/refresh')).toHaveLength(0);
  });

  it('shares one renewal between requests made together', async () => {
    signIn(fakeToken({ expiresInSeconds: -60 }), 'refresh-1');
    fetch.mockImplementation(async (url) => (url.endsWith('/auth/refresh')
      ? json(200, { accessToken: fakeToken() })
      : json(200, { data: [] })));

    await Promise.all([request('/admin/news'), request('/admin/squad'), request('/admin/history')]);

    expect(callsTo('/auth/refresh')).toHaveLength(1);
  });

  it('logs out cleanly when the refresh token is no longer accepted', async () => {
    signIn(fakeToken({ expiresInSeconds: -60 }), 'revoked');
    fetch.mockResolvedValueOnce(json(401, { message: 'Invalid refresh token' }));

    await expect(request('/admin/news')).rejects.toThrow(/session has expired/i);
    expect(getAuthToken()).toBe('');
    expect(hasSession()).toBe(false);
  });

  it('retries once after a 401, then gives up', async () => {
    signIn(fakeToken(), 'refresh-1');
    fetch
      .mockResolvedValueOnce(json(401, {}))
      .mockResolvedValueOnce(json(200, { accessToken: fakeToken() }))
      .mockResolvedValueOnce(json(401, { message: 'Unauthorized' }));

    await expect(request('/admin/news')).rejects.toThrow('Unauthorized');
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('renews the token before an image upload too', async () => {
    signIn(fakeToken({ expiresInSeconds: -60 }), 'refresh-1');
    const fresh = fakeToken();
    fetch
      .mockResolvedValueOnce(json(200, { accessToken: fresh }))
      .mockResolvedValueOnce(json(201, { id: 'm1', url: '/api/v1/media/m1' }));

    const result = await uploadMedia(new File(['x'], 'photo.png', { type: 'image/png' }));

    expect(fetch.mock.calls[1][1].headers.Authorization).toBe(`Bearer ${fresh}`);
    expect(result.url).toMatch(/\/media\/m1$/);
  });
});

describe('hasSession', () => {
  beforeEach(() => clearAuthToken());

  it('is false when logged out', () => {
    expect(hasSession()).toBe(false);
  });

  it('stays true after the access token expires while the refresh token is valid', () => {
    signIn(fakeToken({ expiresInSeconds: -60 }), fakeToken({ type: 'refresh' }));
    expect(hasSession()).toBe(true);
  });

  it('is false once both tokens have expired', () => {
    signIn(fakeToken({ expiresInSeconds: -60 }), fakeToken({ type: 'refresh', expiresInSeconds: -60 }));
    expect(hasSession()).toBe(false);
  });
});
