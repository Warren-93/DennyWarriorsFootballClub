// Builds unsigned JWT-shaped tokens for tests. The site only reads the claims
// (role, exp); the API is what verifies signatures.
function encode(object) {
  return btoa(JSON.stringify(object)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fakeToken({ role = 'EDITOR', type = 'access', expiresInSeconds = 3600 } = {}) {
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: 'tester', role, type, exp })}.signature`;
}
