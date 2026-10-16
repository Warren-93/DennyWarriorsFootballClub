import { request, buildQuery, unwrapList } from './client';

// "Results" are just past fixtures — the backend doesn't have a separate
// results resource, fixtures carry the score once played.
export async function fetchResults(params) {
  return unwrapList(await request(`/fixtures${buildQuery({ ...params, status: 'past' })}`));
}

export function fetchRecentResults(limit = 5) {
  return fetchResults({ limit });
}
