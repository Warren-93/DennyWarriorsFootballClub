import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY, clearAuthToken } from './api/client';
import { fakeToken } from './test/tokens';
import { ordinal } from './pages/Home';
import Navbar from './components/Navbar';
import Fixtures from './pages/Fixtures';
import Squad from './pages/Squad';
import NotFound from './pages/NotFound';
import Login from './pages/admin/Login';
import Admin from './pages/admin/Admin';

const json = (body) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });

// A small fake of the live API, answering by path.
function fakeApi(url) {
  const path = new URL(url).pathname.replace('/api/v1', '');
  if (path === '/fixtures/seasons') return json(['2026/27', '2025/26']);
  if (path === '/fixtures/competitions') return json(['League']);
  if (path === '/squad' || path === '/admin/squad') {
    return json({ data: [{ id: 'p1', name: 'Alex Stone', number: 4, position: 'Defender', appearances: 3, goals: 1 }] });
  }
  return json({ data: [] });
}

function signInAs(role) {
  localStorage.setItem(AUTH_TOKEN_KEY, fakeToken({ role }));
  localStorage.setItem(REFRESH_TOKEN_KEY, fakeToken({ role, type: 'refresh', expiresInSeconds: 604800 }));
}

function renderAt(element, path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes><Route path="*" element={element} /></Routes>
    </MemoryRouter>,
  );
}

describe('ordinal', () => {
  it.each([
    [1, '1st'], [2, '2nd'], [3, '3rd'], [4, '4th'], [11, '11th'], [12, '12th'], [13, '13th'],
    [21, '21st'], [22, '22nd'], [23, '23rd'], [101, '101st'], [111, '111th'],
  ])('ordinal(%i) is %s', (n, expected) => {
    expect(ordinal(n)).toBe(expected);
  });

  it('is empty rather than "nullth" when there is no league position', () => {
    expect(ordinal(null)).toBe('');
  });
});

describe('site', () => {
  beforeEach(() => {
    clearAuthToken();
    vi.stubGlobal('fetch', vi.fn(async (url) => fakeApi(url)));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('takes the season shown in the navbar from the API', async () => {
    renderAt(<Navbar />);

    expect(await screen.findByText('2026/27 Season')).toBeInTheDocument();
  });

  it('asks the API for upcoming fixtures only on the Fixtures page', async () => {
    renderAt(<Fixtures />);

    await vi.waitFor(() => {
      expect(fetch.mock.calls.some(([url]) => /\/fixtures\?status=upcoming/.test(url))).toBe(true);
    });
  });

  it('shows a not-found page for unknown links', () => {
    renderAt(<NotFound />, '/no-such-page');

    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  });

  it('login asks for a username and password only, with no token box', () => {
    renderAt(<Login />, '/admin/login');

    expect(screen.getByText('Username')).toBeInTheDocument();
    expect(screen.queryByText('JWT token')).not.toBeInTheDocument();
    expect(document.querySelector('textarea')).toBeNull();
  });

  it('shows edit controls on the Squad page to editors but not viewers', async () => {
    signInAs('VIEWER');
    const { unmount } = renderAt(<Squad />);
    expect(await screen.findByText('Alex Stone')).toBeInTheDocument();
    expect(screen.queryByText('+ Add player')).not.toBeInTheDocument();
    unmount();

    signInAs('EDITOR');
    renderAt(<Squad />);
    expect(await screen.findByText('+ Add player')).toBeInTheDocument();
  });

  it('shows the Users tab to super-admins only', () => {
    signInAs('EDITOR');
    const { unmount } = renderAt(<Admin />, '/admin');
    expect(screen.queryByRole('button', { name: 'Users' })).not.toBeInTheDocument();
    unmount();

    signInAs('SUPER_ADMIN');
    renderAt(<Admin />, '/admin');
    expect(screen.getByRole('button', { name: 'Users' })).toBeInTheDocument();
  });

  it('hides the dashboard write buttons from viewers', async () => {
    signInAs('VIEWER');
    renderAt(<Admin />, '/admin');

    // Sync is the default tab: no trigger button for a viewer.
    expect(screen.getByText('Refresh')).toBeInTheDocument();
    expect(screen.queryByText('Trigger sync now')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Squad' }));
    expect(await screen.findByRole('heading', { name: 'Squad', level: 2 })).toBeInTheDocument();
    expect(screen.queryByText('+ Add player')).not.toBeInTheDocument();
  });
});
