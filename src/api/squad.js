import { request, buildQuery, unwrapList } from './client';

export async function fetchSquad(params) {
  return unwrapList(await request(`/squad${buildQuery(params)}`));
}

export function fetchPlayerById(id) {
  return request(`/squad/${id}`);
}

export function createPlayer(player) {
  return request('/admin/squad', { method: 'POST', body: JSON.stringify(player) });
}

export function updatePlayer(id, player) {
  return request(`/admin/squad/${id}`, { method: 'PUT', body: JSON.stringify(player) });
}

export function deletePlayer(id) {
  return request(`/admin/squad/${id}`, { method: 'DELETE' });
}
