import { request, buildQuery } from './client';

export function fetchNews(params) {
  return request(`/news${buildQuery(params)}`);
}

export function fetchArticleById(id) {
  return request(`/news/${id}`);
}

export function fetchLatestNews(limit = 3) {
  return request(`/news${buildQuery({ limit })}`);
}

export function createArticle(article) {
  return request('/news', { method: 'POST', body: JSON.stringify(article) });
}

export function updateArticle(id, article) {
  return request(`/news/${id}`, { method: 'PUT', body: JSON.stringify(article) });
}

export function deleteArticle(id) {
  return request(`/news/${id}`, { method: 'DELETE' });
}
