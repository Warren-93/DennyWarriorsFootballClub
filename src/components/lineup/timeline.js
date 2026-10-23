// Shared timing for the on-page reveal and the video export, in ms at 1x.
export const INTRO_MS = 1800;
export const PITCH_MS = 900;
export const PLAYER_MS = 650;
export const LAST_PLAYER_MS = 1100;
export const BENCH_MS = 1000;

// One duration per step: intro, pitch, each starter, bench.
export function stepDurations(starterCount) {
  const players = Array.from({ length: starterCount }, (_, i) => (
    i === starterCount - 1 ? LAST_PLAYER_MS : PLAYER_MS
  ));
  return [INTRO_MS, PITCH_MS, ...players, BENCH_MS];
}

// Absolute times (ms from the start) for the canvas renderer.
export function timelineFor(starterCount) {
  const playersStart = INTRO_MS + PITCH_MS;
  const playerStart = (i) => playersStart + i * PLAYER_MS;
  const benchStart = starterCount > 0
    ? playerStart(starterCount - 1) + LAST_PLAYER_MS
    : playersStart;
  return { pitchStart: INTRO_MS, playerStart, benchStart, finish: benchStart + BENCH_MS };
}
