import React, { useState } from 'react';
import { useSquad } from '../hooks';
import ApiState from '../components/ApiState';
import sharedStyles from './PageShared.module.css';
import styles from './Squad.module.css';

const positions = ['All', 'Goalkeeper', 'Defender', 'Midfielder', 'Forward'];

const positionColours = {
  Goalkeeper: { bg: '#fff3e0', text: '#b35a00' },
  Defender:   { bg: '#e8eef8', text: '#1e4278' },
  Midfielder: { bg: '#e6f4eb', text: '#155e29' },
  Forward:    { bg: '#fde8e8', text: '#922b21' },
};

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
              const colours = positionColours[player.position] || positionColours.Defender;
              const name = getPlayerName(player);
              const number = player.number ?? player.playerNumber ?? '--';
              const primaryMeta = player.age ? `Age: ${player.age}` : `${player.appearances ?? 0} apps`;
              const secondaryMeta = player.nationality || `${player.goals ?? 0} goals`;

              return (
                <div key={player.id || `${name}-${number}`} className={styles.card}>
                  <div className={styles.cardTop}>
                    <span className={styles.number}>{number}</span>
                    <div className={styles.avatar}>
                      {getPlayerInitials(name)}
                    </div>
                  </div>
                  <div className={styles.cardBody}>
                    <h3 className={styles.playerName}>{name}</h3>
                    <span
                      className={styles.positionBadge}
                      style={{ background: colours.bg, color: colours.text }}
                    >
                      {player.position}
                    </span>
                    <div className={styles.playerMeta}>
                      <span>{primaryMeta}</span>
                      <span>{secondaryMeta}</span>
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
