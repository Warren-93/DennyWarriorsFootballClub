import { request } from './client';

// Not a list-envelope endpoint (GET /api/v1/media/videos returns a plain
// array, not { data, page, size, totalElements }), so no unwrapList here.
export function fetchVideos() {
  return request('/media/videos');
}
