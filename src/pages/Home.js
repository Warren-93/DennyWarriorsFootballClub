import React from 'react';
import { Link } from 'react-router-dom';
import { useNextFixture, useRecentResults, useLatestNews, useSeasonStats } from '../hooks';
import ApiState from '../components/ApiState';
import styles from './Home.module.css';

function getResult(r) {
  if (r.goalsFor > r.goalsAgainst) return 'W';
  if (r.goalsFor === r.goalsAgainst) return 'D';
  return 'L';
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function ordinal(n) {
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  return `${n}th`;
}

export default function Home() {
  const { data: nextFixture, loading: fixtureLoading, error: fixtureError } = useNextFixture();
  const { data: recentResults, loading: resultsLoading, error: resultsError } = useRecentResults(3);
  const { data: latestNews, loading: newsLoading, error: newsError } = useLatestNews(3);
  const { data: stats, loading: statsLoading } = useSeasonStats();
  const badgeUrl = `${process.env.PUBLIC_URL || ''}/badge.png`;

  return (
    <div className={styles.page}>
      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroOverlay} />
        <div className={`container ${styles.heroContent}`}>
          <img src={badgeUrl} alt="Denny Warriors FC" className={styles.heroBadge} />
          <h1 className={styles.heroTitle}>Denny Warriors<br />Football Club</h1>
          <p className={styles.heroSub}>Est. 2020</p>
          <div className={styles.heroButtons}>
            <Link to="/fixtures" className="btn btn-primary">View Fixtures</Link>
            <Link to="/squad" className="btn btn-secondary">Meet the Squad</Link>
          </div>
        </div>
      </section>

      {/* ── Season Stats ── */}
      <section className={styles.statsBar}>
        <div className={`container ${styles.statsGrid}`}>
          {statsLoading || !stats ? (
            <div className={styles.statsLoading}>Loading season stats…</div>
          ) : (
            [
              { label: 'League Position', value: ordinal(stats.leaguePosition) },
              { label: 'Points',          value: stats.points },
              { label: 'Wins',            value: stats.won },
              { label: 'Goals For',       value: stats.goalsFor },
              { label: 'Goals Against',   value: stats.goalsAgainst },
            ].map((s) => (
              <div key={s.label} className={styles.statItem}>
                <span className={styles.statValue}>{s.value}</span>
                <span className={styles.statLabel}>{s.label}</span>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ── Next Fixture ── */}
      <section className={`section ${styles.fixtureSection}`}>
        <div className="container">
          <ApiState
            loading={fixtureLoading}
            error={fixtureError}
            empty={!fixtureLoading && !nextFixture}
            emptyMessage="No upcoming fixtures scheduled."
          >
            {nextFixture && (
              <div className={styles.nextFixture}>
                <div className={styles.nextFixtureLabel}>
                  <span className="badge badge-green">Next Match</span>
                </div>
                <div className={styles.matchup}>
                  <div className={styles.team}>
                    <img src={badgeUrl} alt="Denny Warriors" className={styles.teamBadge} />
                    <span>Denny Warriors</span>
                  </div>
                  <div className={styles.vsBlock}>
                    <span className={styles.vs}>VS</span>
                    <span className={styles.matchDate}>{formatDate(nextFixture.date)}</span>
                    <span className={styles.matchTime}>{nextFixture.time}</span>
                    <span className={styles.matchVenue}>
                      {nextFixture.home ? 'Home' : 'Away'}
                    </span>
                    <span className="badge badge-blue">{nextFixture.competition}</span>
                  </div>
                  <div className={`${styles.team} ${styles.teamRight}`}>
                    <div className={styles.opponentPlaceholder}>
                      {nextFixture.opponent.charAt(0)}
                    </div>
                    <span>{nextFixture.opponent}</span>
                  </div>
                </div>
              </div>
            )}
          </ApiState>
        </div>
      </section>

      {/* ── Recent Results ── */}
      <section className={`section ${styles.resultsSection}`}>
        <div className="container">
          <div className="section-header">
            <div>
              <div className="accent-bar" />
              <h2 className="section-title">Recent Results</h2>
              <p className="section-subtitle">How the Warriors have been performing</p>
            </div>
            <Link to="/results" className="btn btn-outline">All Results</Link>
          </div>
          <ApiState
            loading={resultsLoading}
            error={resultsError}
            empty={!resultsLoading && recentResults?.length === 0}
            emptyMessage="No results recorded yet."
          >
            <div className={styles.resultsList}>
              {recentResults?.map((r) => {
                const result = getResult(r);
                return (
                  <div key={r.id} className={styles.resultRow}>
                    <span className={styles.resultDate}>{formatDate(r.date)}</span>
                    <span className={styles.resultVenue}>{r.home ? 'H' : 'A'}</span>
                    <span className={styles.resultOpponent}>{r.opponent}</span>
                    <span className={styles.resultScore}>
                      {r.goalsFor} – {r.goalsAgainst}
                    </span>
                    <span className={`badge badge-result-${result.toLowerCase()}`}>{result}</span>
                    <span className="badge badge-blue">{r.competition}</span>
                  </div>
                );
              })}
            </div>
          </ApiState>
        </div>
      </section>

      {/* ── News ── */}
      <section className={`section ${styles.newsSection}`}>
        <div className="container">
          <div className="section-header">
            <div>
              <div className="accent-bar" />
              <h2 className="section-title">Latest News</h2>
              <p className="section-subtitle">Club updates and announcements</p>
            </div>
            <Link to="/news" className="btn btn-outline">All News</Link>
          </div>
          <ApiState
            loading={newsLoading}
            error={newsError}
            empty={!newsLoading && latestNews?.length === 0}
            emptyMessage="No news articles yet."
          >
            <div className={styles.newsGrid}>
              {latestNews?.map((item) => (
                <article key={item.id} className={styles.newsCard}>
                  <div className={styles.newsCardTop}>
                    <span className="badge badge-blue">{item.category}</span>
                    <time className={styles.newsDate}>{formatDate(item.date)}</time>
                  </div>
                  <h3 className={styles.newsTitle}>{item.title}</h3>
                  <p className={styles.newsExcerpt}>{item.excerpt}</p>
                  <span className={styles.newsAuthor}>By {item.author}</span>
                </article>
              ))}
            </div>
          </ApiState>
        </div>
      </section>
    </div>
  );
}
