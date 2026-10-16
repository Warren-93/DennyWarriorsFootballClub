import { request, unwrapList } from './client';

export async function fetchUsers() {
  return unwrapList(await request('/admin/users'));
}

export function createUser(user) {
  return request('/admin/users', { method: 'POST', body: JSON.stringify(user) });
}

export function deleteUser(id) {
  return request(`/admin/users/${id}`, { method: 'DELETE' });
}
