import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import {
  getAuthToken,
  loginAdmin,
  setAuthToken,
} from '../../api';
import styles from './Admin.module.css';

const IS_DEV = process.env.NODE_ENV !== 'production';

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [manualToken, setManualToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (getAuthToken()) {
    return <Navigate to="/admin" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!manualToken.trim() && (!username.trim() || !password.trim())) {
      setError('Enter a username and password, or paste a JWT token.');
      return;
    }

    setLoading(true);

    try {
      if (manualToken.trim()) {
        setAuthToken(manualToken.trim());
      } else {
        await loginAdmin({ username: username.trim(), password });
      }

      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.adminShell}>
      <div className={styles.loginLayout}>
        <section className={styles.loginIntro}>
          <span className={styles.eyebrow}>Denny Warriors FC</span>
          <h1 className={styles.loginTitle}>Admin control room</h1>
          <p className={styles.loginCopy}>
            Sign in to manage fixtures, results, squad updates, news posts, and the league table.
          </p>
          <Link to="/" className={styles.backLink}>Back to site</Link>
        </section>

        <section className={styles.loginPanel}>
          <form className={styles.loginForm} onSubmit={handleSubmit}>
            <div className={styles.formHeader}>
              <h2>Admin login</h2>
              <p>Use your API login details, or paste an existing JWT token.</p>
            </div>

            {IS_DEV ? (
              <div className={styles.devCredentials}>
                <strong>Local dev login</strong>
                <span>Username: admin</span>
                <span>Password: warriors123</span>
              </div>
            ) : null}

            <label className={styles.field}>
              <span>Username</span>
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                placeholder="admin"
              />
            </label>

            <label className={styles.field}>
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </label>

            <div className={styles.orDivider}>
              <span>or</span>
            </div>

            <label className={styles.field}>
              <span>JWT token</span>
              <textarea
                value={manualToken}
                onChange={(event) => setManualToken(event.target.value)}
                rows={4}
                placeholder="Paste bearer token here"
              />
            </label>

            {error ? <p className={styles.errorBanner}>{error}</p> : null}

            <button type="submit" className={styles.primaryButton} disabled={loading}>
              {loading ? 'Signing in...' : 'Open admin'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
