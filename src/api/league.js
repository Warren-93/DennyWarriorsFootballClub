import { request, unwrapList } from './client';

// The league table is now synced automatically from Comet (no more manual
// admin editing) — this is the same data source AdminSync shows/triggers.
export async function fetchLeagueTable() {
  return unwrapList(await request('/standings'));
}
