import { request } from './client';

export function fetchLeagueTable() {
  return request('/league/table');
}

export function updateLeagueTable(rows) {
  return request('/league/table', { method: 'PUT', body: JSON.stringify({ rows }) });
}
