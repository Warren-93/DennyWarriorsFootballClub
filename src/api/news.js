import { request, buildQuery, unwrapList } from './client';

export async function fetchNews(params) {
  return unwrapList(await request(`/news${buildQuery(params)}`));
}

export function fetchArticleBySlug(slug) {
  return request(`/news/${slug}`);
}

export function fetchLatestNews(limit = 3) {
  return fetchNews({ limit });
}

// Admin-only — sees drafts too, unlike the public listing above.
export async function fetchAllArticlesForAdmin() {
  return unwrapList(await request('/admin/news'));
}

export function createArticle(article) {
  return request('/admin/news', { method: 'POST', body: JSON.stringify(article) });
}

export function updateArticle(id, article) {
  return request(`/admin/news/${id}`, { method: 'PUT', body: JSON.stringify(article) });
}

export function deleteArticle(id) {
  return request(`/admin/news/${id}`, { method: 'DELETE' });
}
