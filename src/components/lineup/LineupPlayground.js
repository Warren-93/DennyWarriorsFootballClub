import React, { useMemo, useState } from 'react';
import LineupReveal from './LineupReveal';
import { FORMATION_KEYS } from './formations';
import { autoPickLineup } from './lineupModel';
import styles from './LineupPlayground.module.css';

const SPEEDS = [0.5, 1, 1.5];

// Wraps the reveal with demo controls: formation, speed, replay and skip.
// The XI is auto-picked from whatever squad it's given.
export default function LineupPlayground({ squad, fixture, sourceLabel, badgeUrl }) {
  const [formation, setFormation] = useState('4-3-3');
  const [speed, setSpeed] = useState(1);
  const [playKey, setPlayKey] = useState(0);
  const [skipped, setSkipped] = useState(false);

  const lineup = useMemo(() => autoPickLineup(squad, formation), [squad, formation]);

  function replay() {
    setSkipped(false);
    setPlayKey((k) => k + 1);
  }

  function changeFormation(next) {
    setFormation(next);
    replay();
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.controls}>
        <div className={styles.group} role="group" aria-label="Formation">
          {FORMATION_KEYS.map((key) => (
            <button
              key={key}
              type="button"
              className={`${styles.chip} ${key === formation ? styles.chipActive : ''}`}
              aria-pressed={key === formation}
              onClick={() => changeFormation(key)}
            >
              {key}
            </button>
          ))}
        </div>

        <div className={styles.group} role="group" aria-label="Speed">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              className={`${styles.chip} ${s === speed ? styles.chipActive : ''}`}
              aria-pressed={s === speed}
              onClick={() => setSpeed(s)}
            >
              {s}×
            </button>
          ))}
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={replay}>
            ▶ Play reveal
          </button>
          <button type="button" className={styles.secondary} onClick={() => setSkipped(true)}>
            Skip to end
          </button>
        </div>
      </div>

      <LineupReveal
        lineup={lineup}
        fixture={fixture}
        speed={speed}
        playKey={playKey}
        skipToEnd={skipped}
        badgeUrl={badgeUrl}
      />

      {sourceLabel && <p className={styles.source}>{sourceLabel}</p>}
    </div>
  );
}
