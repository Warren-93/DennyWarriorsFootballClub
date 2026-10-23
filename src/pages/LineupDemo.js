import React from 'react';
import { useSquad, useNextFixture } from '../hooks';
import LineupPlayground from '../components/lineup/LineupPlayground';
import { SAMPLE_FIXTURE, SAMPLE_SQUAD } from '../components/lineup/sampleData';
import sharedStyles from './PageShared.module.css';

// Prototype page (not linked from the navbar): /lineup-demo
// Uses the live squad and next fixture when the API has them, otherwise
// falls back to sample data so the animation can always be previewed.
export default function LineupDemo() {
  const { data: squad, loading: squadLoading } = useSquad();
  const { data: nextFixture } = useNextFixture();

  const hasSquad = Array.isArray(squad) && squad.length >= 11;
  const players = hasSquad ? squad : SAMPLE_SQUAD;
  const fixture = nextFixture || SAMPLE_FIXTURE;

  const sourceLabel = [
    hasSquad ? 'Players: live squad from the API (XI auto-picked by appearances).' : 'Players: sample squad (API unavailable or fewer than 11 players).',
    nextFixture ? 'Fixture: next fixture from the API.' : 'Fixture: sample.',
  ].join(' ');

  return (
    <div className={sharedStyles.page}>
      <div className={sharedStyles.pageHero}>
        <div className="container">
          <h1 className={sharedStyles.pageTitle}>Team News</h1>
          <p className={sharedStyles.pageSubtitle}>Lineup reveal prototype</p>
        </div>
      </div>

      <div className="container section">
        {squadLoading ? (
          <p>Loading squad…</p>
        ) : (
          <LineupPlayground squad={players} fixture={fixture} sourceLabel={sourceLabel} />
        )}
      </div>
    </div>
  );
}
