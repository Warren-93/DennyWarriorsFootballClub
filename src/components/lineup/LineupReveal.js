import React, { useEffect, useMemo, useState } from 'react';
import { FORMATIONS } from './formations';
import { splitName } from './lineupModel';
import styles from './LineupReveal.module.css';

// Timeline, in ms at 1x speed. The component walks through these steps:
//   0            intro card ("Team news")
//   1            pitch tilts in and its lines draw
//   2 … n+1      one starter lands per step, keeper first
//   n+2          substitutes strip slides in
//   n+3          finished, everything at rest
const INTRO_MS = 1800;
const PITCH_MS = 900;
const PLAYER_MS = 650;
const LAST_PLAYER_MS = 1100;
const BENCH_MS = 1000;

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

function formatKickoff(fixture) {
  if (!fixture) return '';
  const when = fixture.date || fixture.kickoffAt;
  const day = when
    ? new Date(when).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
    : '';
  return [day, fixture.time && `KO ${fixture.time}`].filter(Boolean).join(' · ');
}

export default function LineupReveal({
  lineup,
  fixture,
  clubName = 'Denny Warriors',
  badgeUrl = `${process.env.PUBLIC_URL || ''}/badge.png`,
  speed = 1,
  playKey = 0,
  skipToEnd = false,
}) {
  const slots = FORMATIONS[lineup.formation] || [];
  const slotById = useMemo(() => new Map(slots.map((s) => [s.slot, s])), [slots]);
  const starters = lineup.starters.filter((s) => slotById.has(s.slot));
  const n = starters.length;

  const durations = useMemo(
    () => [INTRO_MS, PITCH_MS, ...starters.map((_, i) => (i === n - 1 ? LAST_PLAYER_MS : PLAYER_MS)), BENCH_MS],
    [n] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const finalStep = durations.length;

  const [step, setStep] = useState(0);

  // Restart whenever the parent asks for a replay (or changes the lineup).
  useEffect(() => {
    setStep(skipToEnd || prefersReducedMotion() ? finalStep : 0);
  }, [playKey, finalStep, skipToEnd]);

  useEffect(() => {
    if (step >= finalStep) return undefined;
    const timer = setTimeout(() => setStep((s) => s + 1), durations[step] / speed);
    return () => clearTimeout(timer);
  }, [step, finalStep, durations, speed]);

  const revealed = Math.max(0, Math.min(step - 1, n));
  const currentIndex = step >= 2 && step <= n + 1 ? step - 2 : -1;
  const current = currentIndex >= 0 ? starters[currentIndex] : null;
  const showBench = step >= n + 2;
  const opponent = fixture?.opponent || 'Opposition';
  const homeFirst = fixture?.home !== false;

  return (
    <div className={styles.frame}>
      <div
        className={styles.stage}
        aria-label={`${clubName} starting eleven, ${lineup.formation}`}
      >
        <div className={styles.sweep} aria-hidden="true" />

        {/* Intro card */}
        {step === 0 && (
          <div className={styles.intro} aria-hidden="true">
            <div className={styles.introBandBlue} />
            <div className={styles.introBandGreen} />
            <div className={styles.introContent}>
              <img src={badgeUrl} alt="" className={styles.introBadge} />
              <div>
                <div className={styles.introKicker}>Team news</div>
                <div className={styles.introTitle}>Starting XI</div>
                <div className={styles.introMeta}>
                  v {opponent}
                  {fixture?.competition ? ` · ${fixture.competition}` : ''}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Top bar */}
        <header className={`${styles.topBar} ${step >= 1 ? styles.topBarIn : ''}`}>
          <img src={badgeUrl} alt="" className={styles.topBadge} />
          <div className={styles.matchup}>
            <span className={homeFirst ? styles.us : ''}>{homeFirst ? clubName : opponent}</span>
            <span className={styles.vs}>v</span>
            <span className={homeFirst ? '' : styles.us}>{homeFirst ? opponent : clubName}</span>
          </div>
          <div className={styles.matchMeta}>
            {[fixture?.competition, formatKickoff(fixture)].filter(Boolean).join(' · ')}
          </div>
          <div className={styles.formationChip}>{lineup.formation}</div>
        </header>

        <div className={styles.body}>
          {/* Pitch */}
          <div className={styles.pitchWrap}>
            <div className={`${styles.pitch} ${step >= 1 ? styles.pitchIn : ''}`}>
              <PitchLines drawn={step >= 1} />
              <div className={styles.field}>
                {starters.map(({ slot, player }, i) => {
                  const pos = slotById.get(slot);
                  if (i >= revealed) return null;
                  const { last } = splitName(player.name);
                  return (
                    <div
                      key={`${playKey}-${slot}`}
                      className={`${styles.token} ${i === currentIndex ? styles.tokenCurrent : ''}`}
                      style={{ left: `${pos.x}%`, top: `${100 - pos.y}%` }}
                    >
                      <div className={styles.tokenInner}>
                        <div className={styles.disc}>
                          {player.profileImage
                            ? <img src={player.profileImage} alt="" />
                            : <span>{player.number ?? ''}</span>}
                          {player.captain && <span className={styles.armband}>C</span>}
                        </div>
                        <div className={styles.tokenName}>{last}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className={styles.side}>
            {/* Feature panel: the player being revealed, then the bench */}
            <div className={styles.feature}>
              {current && (
                <div key={`${playKey}-${current.slot}`} className={styles.spotlight}>
                  <div className={styles.spotNumber}>{current.player.number ?? ''}</div>
                  <div className={styles.spotText}>
                    <div className={styles.spotFirst}>{splitName(current.player.name).first}</div>
                    <div className={styles.spotLast}>{splitName(current.player.name).last}</div>
                    <div className={styles.spotMeta}>
                      <span className={styles.spotSlot}>{current.slot}</span>
                      {current.player.position}
                      {current.player.captain && <span className={styles.spotCaptain}>Captain</span>}
                    </div>
                    <div className={styles.spotStats}>
                      <span><b>{current.player.appearances ?? 0}</b> apps</span>
                      <span><b>{current.player.goals ?? 0}</b> goals</span>
                    </div>
                  </div>
                </div>
              )}
              {showBench && (
                <div className={styles.bench}>
                  <div className={styles.benchLabel}>Substitutes</div>
                  <ul className={styles.benchList}>
                    {lineup.substitutes.map((player, i) => (
                      <li key={player.id} style={{ '--i': i }}>
                        <b>{player.number ?? ''}</b>
                        <span>{player.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Teamsheet list */}
            <ol className={styles.sheet}>
              {starters.map(({ slot, player }, i) => (
                <li
                  key={`${playKey}-${slot}`}
                  className={`${styles.row} ${i < revealed ? styles.rowIn : ''} ${i === currentIndex ? styles.rowCurrent : ''}`}
                >
                  <span className={styles.rowNum}>{player.number ?? '–'}</span>
                  <span className={styles.rowName}>
                    {player.name}
                    {player.captain && <span className={styles.rowCaptain}>C</span>}
                  </span>
                  <span className={styles.rowSlot}>{slot}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

// Pitch markings to scale, in metres (68 × 105), our goal at the bottom.
function PitchLines({ drawn }) {
  return (
    <svg
      className={`${styles.lines} ${drawn ? styles.linesDrawn : ''}`}
      viewBox="-2 -2 72 109"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <rect x="0" y="0" width="68" height="105" pathLength="100" />
      <line x1="0" y1="52.5" x2="68" y2="52.5" pathLength="100" />
      <circle cx="34" cy="52.5" r="9.15" pathLength="100" />
      <rect x="13.84" y="0" width="40.32" height="16.5" pathLength="100" />
      <rect x="24.84" y="0" width="18.32" height="5.5" pathLength="100" />
      <rect x="13.84" y="88.5" width="40.32" height="16.5" pathLength="100" />
      <rect x="24.84" y="99.5" width="18.32" height="5.5" pathLength="100" />
      <path d="M 26.7 16.5 A 9.15 9.15 0 0 0 41.3 16.5" pathLength="100" />
      <path d="M 26.7 88.5 A 9.15 9.15 0 0 1 41.3 88.5" pathLength="100" />
    </svg>
  );
}
