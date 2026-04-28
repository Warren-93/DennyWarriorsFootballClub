import { useApi } from './useApi';
import {
  fetchFixtures,
  fetchNextFixture,
  fetchResults,
  fetchRecentResults,
  fetchSquad,
  fetchNews,
  fetchLatestNews,
  fetchLeagueTable,
  fetchSeasonStats,
} from '../api';

// Stable dep key for object params so we re-fetch when fields change.
const key = (params) => JSON.stringify(params);

export const useFixtures      = (params = {}) => useApi(() => fetchFixtures(params),      [key(params)], []);
export const useNextFixture   = ()            => useApi(fetchNextFixture,                  []);
export const useResults       = (params = {}) => useApi(() => fetchResults(params),       [key(params)], []);
export const useRecentResults = (limit = 5)   => useApi(() => fetchRecentResults(limit),  [limit],       []);
export const useSquad         = (params = {}) => useApi(() => fetchSquad(params),         [key(params)], []);
export const useNews          = (params = {}) => useApi(() => fetchNews(params),          [key(params)], []);
export const useLatestNews    = (limit = 3)   => useApi(() => fetchLatestNews(limit),     [limit],       []);
export const useLeagueTable   = ()            => useApi(fetchLeagueTable,                  []);
export const useSeasonStats   = ()            => useApi(fetchSeasonStats,                  []);
