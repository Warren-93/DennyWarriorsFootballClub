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

export function updateSyncSettings(intervalMinutes) {
  return request('/admin/sync/settings', {
    method: 'PUT',
    body: JSON.stringify({ intervalMinutes }),
  });
}
