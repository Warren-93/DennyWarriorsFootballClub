import React, { useState } from 'react';
import { useResults } from '../hooks';
import ApiState from '../components/ApiState';
import styles from './PageShared.module.css';

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function getResult(r) {
  if (r.goalsFor > r.goalsAgainst) return 'W';
  if (r.goalsFor === r.goalsAgainst) return 'D';
  return 'L';
}

const COMPETITIONS = ['All', 'League', 'Cup'];

export default function Results() {
  const [competition, setCompetition] = useState('All');
  const params = competition !== 'All' ? { competition } : {};
  const { data: results, loading, error, refetch } = useResults(params);

  return (
    <div className={styles.page}>
      <div className={styles.pageHero}>
        <div className="container">
          <h1 className={styles.pageTitle}>Results</h1>
          <p className={styles.pageSubtitle}>2024/25 Season — Match Results</p>
        </div>
      </div>

      <div className="container section">
        <div className={styles.filterRow}>
          {COMPETITIONS.map(c => (
            <button
              key={c}
              className={`${styles.filterBtn} ${competition === c ? styles.filterActive : ''}`}
              onClick={() => setCompetition(c)}
            >
              {c}
            </button>
          ))}
        </div>

        <ApiState
          loading={loading}
          error={error}
          empty={!loading && results?.length === 0}
          emptyMessage="No results recorded yet."
          onRetry={refetch}
        >
          <div className={styles.list}>
            {results?.map((r) => {
              const result = getResult(r);
              return (
                <div key={r.id} className={styles.matchCard}>
                  <div className={styles.matchMeta}>
                    <span className="badge badge-blue">{r.competition}</span>
                    <span className={styles.matchDateText}>{formatDate(r.date)}</span>
                  </div>
                  <div className={styles.matchTeams}>
                    {r.home ? (
                      <>
                        <span className={`${styles.team} ${styles.teamHighlight}`}>Denny Warriors</span>
                        <span className={styles.scoreBlock}>{r.goalsFor} – {r.goalsAgainst}</span>
                        <span className={styles.team}>{r.opponent}</span>
                      </>
                    ) : (
                      <>
                        <span className={styles.team}>{r.opponent}</span>
                        <span className={styles.scoreBlock}>{r.goalsAgainst} – {r.goalsFor}</span>
                        <span className={`${styles.team} ${styles.teamHighlight}`}>Denny Warriors</span>
                      </>
                    )}
                  </div>
                  <div className={styles.matchVenueTag}>
                    <span className={`badge badge-result-${result.toLowerCase()}`}>{result}</span>
                    <span className={`badge ${r.home ? 'badge-green' : 'badge-blue'}`}>
                      {r.home ? 'Home' : 'Away'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </ApiState>
      </div>
    </div>
  );
}
