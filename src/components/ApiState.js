import React from 'react';
import styles from './ApiState.module.css';

/**
 * Renders a loading spinner, error message, or empty state.
 * Use this to wrap any section that fetches from the API.
 *
 * @example
 * <ApiState loading={loading} error={error} empty={data.length === 0}>
 *   {data.map(item => <Card key={item.id} {...item} />)}
 * </ApiState>
 */
export default function ApiState({
  loading,
  error,
  empty = false,
  emptyMessage = 'No data available.',
  onRetry,
  children,
}) {
  if (loading) {
    return (
      <div className={styles.center}>
        <div className={styles.spinner} aria-label="Loading…" />
        <p className={styles.message}>Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.center}>
        <div className={styles.errorIcon}>!</div>
        <p className={styles.message}>{error}</p>
        {onRetry && (
          <button className={styles.retryBtn} onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    );
  }

  if (empty) {
    return (
      <div className={styles.center}>
        <p className={styles.message}>{emptyMessage}</p>
      </div>
    );
  }

  return children;
}
