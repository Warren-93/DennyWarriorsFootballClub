import React, { useState } from 'react';
import { useSquad } from '../hooks';
import ApiState from '../components/ApiState';
import sharedStyles from './PageShared.module.css';
import styles from './Squad.module.css';

const positions = ['All', 'Goalkeeper', 'Defender', 'Midfielder', 'Forward'];

function getPlayerName(player) {
  const fullName = player?.name?.trim();
  if (fullName) return fullName;

  return [player?.playerFirstName, player?.playerSurename]
    .filter(Boolean)
    .join(' ')
    .trim() || 'Unnamed Player';
}

function getPlayerInitials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();
}

export default function Squad() {
  const [filter, setFilter] = useState('All');

  // Fetch full squad from API; filter client-side for instant tab switching
  const { data: squad, loading, error, refetch } = useSquad();

  const filtered = !squad
    ? []
    : filter === 'All'
      ? squad
      : squad.filter(p => p.position === filter);

  return (
    <div className={sharedStyles.page}>
      <div className={sharedStyles.pageHero}>
        <div className="container">
          <h1 className={sharedStyles.pageTitle}>Squad</h1>
          <p className={sharedStyles.pageSubtitle}>2024/25 First Team</p>
        </div>
      </div>

      <div className="container section">
        <div className={styles.filters}>
          {positions.map(pos => (
            <button
              key={pos}
              className={`${styles.filterBtn} ${filter === pos ? styles.filterActive : ''}`}
              onClick={() => setFilter(pos)}
            >
              {pos}
            </button>
          ))}
        </div>

        <ApiState
          loading={loading}
          error={error}
          empty={!loading && filtered.length === 0}
          emptyMessage="No players found for this position."
          onRetry={refetch}
        >
          <div className={styles.grid}>
            {filtered.map(player => {
              const name = getPlayerName(player);
              const number = player.number ?? player.playerNumber ?? '--';
              const apps = player.appearances ?? 0;
              const goals = player.goals ?? 0;
              const sponsors = player.sponsorLogos || [];

              return (
                <div key={player.id || `${name}-${number}`} className={styles.card}>
                  <div className={styles.header}>
                    <div className={styles.headerRow}>
                      <h3 className={styles.playerName}>
                        {name}
                        {player.captain && <span className={styles.captainTag}>(C)</span>}
                      </h3>
                      <span className={styles.playerNumber}>#{number}</span>
                    </div>
                  </div>

                  <div className={styles.body}>
                    {sponsors.length > 0 && (
                      <div className={styles.sponsorColumn}>
                        <span className={styles.sponsorLabel}>Sponsors</span>
                        {sponsors.map((url, i) => (
                          <div key={i} className={styles.sponsorBox}>
                            <img src={url} alt="Club sponsor" />
                          </div>
                        ))}
                      </div>
                    )}

                    <div className={styles.photoColumn}>
                      {player.profileImage ? (
                        <img src={player.profileImage} alt={name} className={styles.photo} />
                      ) : (
                        <div className={styles.photoPlaceholder}>{getPlayerInitials(name)}</div>
                      )}
                    </div>
                  </div>

                  <div className={styles.footer}>
                    <span className={styles.positionBadge}>{player.position}</span>
                    <div className={styles.statsRow}>
                      <span>{apps} apps</span>
                      <span>{goals} goals</span>
                    </div>
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
