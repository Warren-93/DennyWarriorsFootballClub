import React, { useEffect, useState } from 'react';
import { useFixtures, useSeasons, useCompetitions } from '../hooks';
import ApiState from '../components/ApiState';
import styles from './PageShared.module.css';

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default function Fixtures() {
  const { data: seasons } = useSeasons();
  const { data: competitions } = useCompetitions();
  const [season, setSeason] = useState('');
  const [competition, setCompetition] = useState('All');

  // Default to the most recent season once it loads (seasons is newest-first).
  useEffect(() => {
    if (!season && seasons && seasons.length > 0) {
      setSeason(seasons[0]);
    }
  }, [seasons, season]);

  const params = {
    ...(season ? { season } : {}),
    ...(competition !== 'All' ? { competition } : {}),
  };
  const { data: fixtures, loading, error, refetch } = useFixtures(params);

  const competitionOptions = ['All', ...(competitions || [])];

  return (
    <div className={styles.page}>
      <div className={styles.pageHero}>
        <div className="container">
          <h1 className={styles.pageTitle}>Fixtures</h1>
          <p className={styles.pageSubtitle}>{season || 'All seasons'} — Upcoming Matches</p>
        </div>
      </div>

      <div className="container section">
        <div className={styles.filterBar}>
          <div className={styles.filterRow}>
            {competitionOptions.map(c => (
              <button
                key={c}
                className={`${styles.filterBtn} ${competition === c ? styles.filterActive : ''}`}
                onClick={() => setCompetition(c)}
              >
                {c}
              </button>
            ))}
          </div>

          {seasons && seasons.length > 1 && (
            <select
              className={styles.filterSelect}
              value={season}
              onChange={(event) => setSeason(event.target.value)}
              aria-label="Season"
            >
              {seasons.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}
        </div>

        <ApiState
          loading={loading}
          error={error}
          empty={!loading && fixtures?.length === 0}
          emptyMessage="No fixtures scheduled for this season."
          onRetry={refetch}
        >
          <div className={styles.list}>
            {fixtures?.map((f) => (
              <div key={f.id} className={styles.matchCard}>
                <div className={styles.matchMeta}>
                  <span className="badge badge-blue">{f.competition}</span>
                  <span className={styles.matchDateText}>{formatDate(f.date)}</span>
                  <span className={styles.matchTime}>{f.time}</span>
                </div>
                <div className={styles.matchTeams}>
                  {f.home ? (
                    <>
                      <span className={`${styles.team} ${styles.teamHighlight}`}>Denny Warriors</span>
                      <span className={styles.separator}>vs</span>
                      <span className={styles.team}>{f.opponent}</span>
                    </>
                  ) : (
                    <>
                      <span className={styles.team}>{f.opponent}</span>
                      <span className={styles.separator}>vs</span>
                      <span className={`${styles.team} ${styles.teamHighlight}`}>Denny Warriors</span>
                    </>
                  )}
                </div>
                <div className={styles.matchVenueTag}>
                  <span className={`badge ${f.home ? 'badge-green' : 'badge-blue'}`}>
                    {f.home ? 'Home' : 'Away'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </ApiState>
      </div>
    </div>
  );
}
