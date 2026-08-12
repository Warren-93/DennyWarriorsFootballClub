import { request, unwrapList } from './client';

export function triggerSync() {
  return request('/admin/sync/trigger', { method: 'POST' });
}

export async function fetchSyncLogs() {
  return unwrapList(await request('/admin/sync/logs'));
}
