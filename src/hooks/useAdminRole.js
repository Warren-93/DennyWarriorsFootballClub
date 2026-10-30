import { useEffect, useState } from 'react';
import {
  AUTH_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  decodeTokenClaims,
  getAuthToken,
  getRefreshToken,
  hasSession,
} from '../api/client';

function readRole() {
  if (!hasSession()) return null;
  // The access token may have expired (the next request renews it); the
  // refresh token carries the same role.
  return decodeTokenClaims(getAuthToken())?.role || decodeTokenClaims(getRefreshToken())?.role || null;
}

// Client-side role read for UI-gating only — mirrors the backend's actual
// write permissions in SecurityConfig (SUPER_ADMIN/EDITOR can write, VIEWER
// can't) so a VIEWER account never sees controls it can't use. Real
// enforcement always happens server-side regardless of this.
//
// Re-reads when the window regains focus or another tab logs in or out, so
// an expired login stops showing admin controls without a page reload.
export default function useAdminRole() {
  const [role, setRole] = useState(readRole);

  useEffect(() => {
    const update = () => setRole(readRole());
    const onStorage = (event) => {
      if (event.key === null || event.key === AUTH_TOKEN_KEY || event.key === REFRESH_TOKEN_KEY) update();
    };
    window.addEventListener('focus', update);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('focus', update);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return {
    loggedIn: Boolean(role),
    role,
    canEdit: role === 'SUPER_ADMIN' || role === 'EDITOR',
    isSuperAdmin: role === 'SUPER_ADMIN',
  };
}
