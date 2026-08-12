import { useApi } from './useApi';
import {
  fetchFixtures,
  fetchNextFixture,
  fetchSeasons,
  fetchCompetitions,
  fetchResults,
  fetchRecentResults,
  fetchSquad,
  fetchNews,
  fetchLatestNews,
  fetchArticleBySlug,
  fetchLeagueTable,
  fetchSeasonStats,
  fetchHistory,
  fetchVideos,
} from '../api';

// Stable dep key for object params so we re-fetch when fields change.
const key = (params) => JSON.stringify(params);

export const useFixtures      = (params = {}) => useApi(() => fetchFixtures(params),      [key(params)], []);
export const useNextFixture   = ()            => useApi(fetchNextFixture,                  []);
export const useSeasons       = ()            => useApi(fetchSeasons,                      [],            []);
export const useCompetitions  = ()            => useApi(fetchCompetitions,                  [],            []);
export const useResults       = (params = {}) => useApi(() => fetchResults(params),       [key(params)], []);
export const useRecentResults = (limit = 5)   => useApi(() => fetchRecentResults(limit),  [limit],       []);
export const useSquad         = (params = {}) => useApi(() => fetchSquad(params),         [key(params)], []);
export const useNews          = (params = {}) => useApi(() => fetchNews(params),          [key(params)], []);
export const useLatestNews    = (limit = 3)   => useApi(() => fetchLatestNews(limit),     [limit],       []);
export const useArticle       = (slug)        => useApi(() => fetchArticleBySlug(slug),   [slug],        null);
export const useLeagueTable   = ()            => useApi(fetchLeagueTable,                  []);
export const useSeasonStats   = ()            => useApi(fetchSeasonStats,                  []);
export const useHistory       = (params = {}) => useApi(() => fetchHistory(params),       [key(params)], []);
export const useVideos        = ()            => useApi(fetchVideos,                       [],            []);
