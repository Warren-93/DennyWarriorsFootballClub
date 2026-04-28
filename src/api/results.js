import { request, buildQuery } from './client';

export function fetchResults(params) {
  return request(`/results${buildQuery(params)}`);
}

export function fetchResultById(id) {
  return request(`/results/${id}`);
}

export function fetchRecentResults(limit = 5) {
  return request(`/results${buildQuery({ limit })}`);
}

export function createResult(result) {
  return request('/results', { method: 'POST', body: JSON.stringify(result) });
}

export function updateResult(id, result) {
  return request(`/results/${id}`, { method: 'PUT', body: JSON.stringify(result) });
}

export function deleteResult(id) {
  return request(`/results/${id}`, { method: 'DELETE' });
}
