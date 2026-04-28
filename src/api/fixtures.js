import { request, buildQuery } from './client';

export function fetchFixtures(params) {
  return request(`/fixtures${buildQuery(params)}`);
}

export function fetchFixtureById(id) {
  return request(`/fixtures/${id}`);
}

export function fetchNextFixture() {
  return request('/fixtures/next');
}

export function createFixture(fixture) {
  return request('/fixtures', { method: 'POST', body: JSON.stringify(fixture) });
}

export function updateFixture(id, fixture) {
  return request(`/fixtures/${id}`, { method: 'PUT', body: JSON.stringify(fixture) });
}

export function deleteFixture(id) {
  return request(`/fixtures/${id}`, { method: 'DELETE' });
}
