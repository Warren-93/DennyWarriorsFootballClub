import { request } from './client';

export function fetchSeasonStats() {
  return request('/stats');
}
