import { request, buildQuery, unwrapList } from './client';

export async function fetchFixtures(params) {
  return unwrapList(await request(`/fixtures${buildQuery(params)}`));
}

export function fetchFixtureById(id) {
  return request(`/fixtures/${id}`);
}

export function fetchNextFixture() {
  return request('/fixtures/next');
}

export function fetchSeasons() {
  return request('/fixtures/seasons');
}

export function fetchCompetitions() {
  return request('/fixtures/competitions');
}
