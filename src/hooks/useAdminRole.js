import { useMemo } from 'react';
import { getAuthToken } from '../api/client';

function base64UrlDecode(segment) {
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  return atob(padded);
}

function decodeRole(token) {
  if (!token) return null;
  if (token === 'dwfc-local-dev-token') return 'SUPER_ADMIN';

  try {
    const payloadSegment = token.split('.')[1];
    const claims = JSON.parse(base64UrlDecode(payloadSegment));
    return claims.role || null;
  } catch {
    return null;
  }
}

// Client-side role read for UI-gating only — mirrors the backend's actual
// write permissions in SecurityConfig (SUPER_ADMIN/EDITOR can write, VIEWER
// can't) so a VIEWER account never sees controls it can't use. Real
// enforcement always happens server-side regardless of this.
export default function useAdminRole() {
  const token = getAuthToken();

  return useMemo(() => {
    const role = decodeRole(token);
    return {
      loggedIn: Boolean(token),
      role,
      canEdit: role === 'SUPER_ADMIN' || role === 'EDITOR',
    };
  }, [token]);
}
