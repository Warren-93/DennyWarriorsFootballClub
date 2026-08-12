import { request, buildQuery, unwrapList } from './client';

export async function fetchHistory(params) {
  return unwrapList(await request(`/history${buildQuery(params)}`));
}

export function createHistoryEntry(entry) {
  return request('/admin/history', { method: 'POST', body: JSON.stringify(entry) });
}

export function updateHistoryEntry(id, entry) {
  return request(`/admin/history/${id}`, { method: 'PUT', body: JSON.stringify(entry) });
}

export function deleteHistoryEntry(id) {
  return request(`/admin/history/${id}`, { method: 'DELETE' });
}
