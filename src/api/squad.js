import { request, buildQuery } from './client';

export function fetchSquad(params) {
  return request(`/squad${buildQuery(params)}`);
}

export function fetchPlayerById(id) {
  return request(`/squad/${id}`);
}

export function createPlayer(player) {
  return request('/squad', { method: 'POST', body: JSON.stringify(player) });
}

export function updatePlayer(id, player) {
  return request(`/squad/${id}`, { method: 'PUT', body: JSON.stringify(player) });
}

export function deletePlayer(id) {
  return request(`/squad/${id}`, { method: 'DELETE' });
}
