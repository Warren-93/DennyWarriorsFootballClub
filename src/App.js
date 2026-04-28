import React from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';

import Navbar from './components/Navbar';
import Footer from './components/Footer';

import Home from './pages/Home';
import Fixtures from './pages/Fixtures';
import Results from './pages/Results';
import LeagueTable from './pages/LeagueTable';
import Squad from './pages/Squad';
import News from './pages/News';
import Login from './pages/admin/Login';
import Admin from './pages/admin/Admin';
import { getAuthToken } from './api';

function RequireAdminAuth({ children }) {
  if (!getAuthToken()) {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
}

function AppLayout() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <>
      {!isAdminRoute && <Navbar />}
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/fixtures" element={<Fixtures />} />
          <Route path="/results" element={<Results />} />
          <Route path="/table" element={<LeagueTable />} />
          <Route path="/squad" element={<Squad />} />
          <Route path="/news" element={<News />} />
          <Route path="/admin/login" element={<Login />} />
          <Route
            path="/admin"
            element={(
              <RequireAdminAuth>
                <Admin />
              </RequireAdminAuth>
            )}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!isAdminRoute && <Footer />}
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}

export default App;