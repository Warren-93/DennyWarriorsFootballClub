import { request, unwrapList } from './client';

export function triggerSync() {
  return request('/admin/sync/trigger', { method: 'POST' });
}

export async function fetchSyncLogs() {
  return unwrapList(await request('/admin/sync/logs'));
}

export function fetchSyncSettings() {
  return request('/admin/sync/settings');
}

// Super-admin only. The API never returns the links themselves (they carry
// the Comet API key), just where each comes from, a key hint and its filters.
export function fetchCometLinks() {
  return request('/admin/sync/comet-links');
}

// Per link: undefined leaves it unchanged, '' clears it back to the
// environment variable on Render, anything else replaces it.
export function updateCometLinks({ fixturesUrl, standingsUrl }) {
  return request('/admin/sync/comet-links', {
    method: 'PUT',
    body: JSON.stringify({ fixturesUrl, standingsUrl }),
  });
}

export function updateSyncSettings(intervalDays) {
  return request('/admin/sync/settings', {
    method: 'PUT',
    body: JSON.stringify({ intervalDays }),
  });
}
