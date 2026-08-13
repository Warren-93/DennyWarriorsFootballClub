import { request, buildApiUrl, getAuthToken } from './client';

// Not a list-envelope endpoint (GET /api/v1/media/videos returns a plain
// array, not { data, page, size, totalElements }), so no unwrapList here.
export function fetchVideos() {
  return request('/media/videos');
}

// Bypasses the JSON-only request() helper — a FormData body must not get a
// manual Content-Type header, the browser sets its own multipart boundary.
export async function uploadMedia(file) {
  const formData = new FormData();
  formData.append('file', file);

  const token = getAuthToken();
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(buildApiUrl('/admin/media'), {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Upload failed with status ${response.status}`);
  }

  const payload = await response.json();
  // payload.url is API-relative ("/api/v1/media/{id}"); buildApiUrl already
  // prepends the API base, so build the absolute URL from the id instead.
  return { ...payload, url: buildApiUrl(`/media/${payload.id}`) };
}
