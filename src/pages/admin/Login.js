import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { hasSession, loginAdmin } from '../../api';
import styles from './Admin.module.css';
import { CLUB_NAME } from '../../config/club';

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (hasSession()) {
    return <Navigate to="/admin" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Enter your username and password.');
      return;
    }

    setLoading(true);

    try {
      await loginAdmin({ username: username.trim(), password });

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
          <span className={styles.eyebrow}>{CLUB_NAME}</span>
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
              <p>Sign in with your staff account.</p>
            </div>


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
