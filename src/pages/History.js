import React from 'react';
import { useHistory } from '../hooks';
import ApiState from '../components/ApiState';
import sharedStyles from './PageShared.module.css';
import styles from './History.module.css';

export default function History() {
  const { data: entries, loading, error, refetch } = useHistory();

  const timeline = (entries || []).filter((entry) => entry.type === 'TIMELINE');
  const honours = (entries || []).filter((entry) => entry.type === 'HONOUR');

  return (
    <div className={sharedStyles.page}>
      <div className={sharedStyles.pageHero}>
        <div className="container">
          <h1 className={sharedStyles.pageTitle}>Club History</h1>
          <p className={sharedStyles.pageSubtitle}>Our journey, milestones &amp; honours</p>
        </div>
      </div>

      <div className="container section">
        <ApiState
          loading={loading}
          error={error}
          empty={!loading && (entries || []).length === 0}
          emptyMessage="No history recorded yet."
          onRetry={refetch}
        >
          <>
            <h2 className={styles.sectionHeading}>Timeline</h2>
            {timeline.length === 0 ? (
              <p>No timeline entries yet.</p>
            ) : (
              <div className={styles.timeline}>
                {timeline.map((entry) => (
                  <div key={entry.id} className={styles.timelineItem}>
                    <span className={styles.timelineYear}>{entry.year}</span>
                    <h3 className={styles.timelineTitle}>{entry.title}</h3>
                    <p className={styles.timelineDescription}>{entry.description}</p>
                  </div>
                ))}
              </div>
            )}

            <h2 className={`${styles.sectionHeading} ${styles.sectionGap}`}>Honours</h2>
            {honours.length === 0 ? (
              <p>No honours recorded yet.</p>
            ) : (
              <div className={styles.honoursGrid}>
                {honours.map((entry) => (
                  <div key={entry.id} className={styles.honourCard}>
                    <span className={styles.honourYear}>{entry.year}</span>
                    <h3 className={styles.honourTitle}>{entry.title}</h3>
                    {entry.description ? (
                      <p className={styles.honourDescription}>{entry.description}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </>
        </ApiState>
      </div>
    </div>
  );
}
