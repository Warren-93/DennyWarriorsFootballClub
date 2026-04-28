import React from 'react';
import { useLeagueTable } from '../hooks';
import ApiState from '../components/ApiState';
import styles from './LeagueTable.module.css';
import sharedStyles from './PageShared.module.css';

export default function LeagueTable() {
  const { data: table, loading, error, refetch } = useLeagueTable();
  const badgeUrl = `${process.env.PUBLIC_URL || ''}/badge.png`;

  return (
    <div className={sharedStyles.page}>
      <div className={sharedStyles.pageHero}>
        <div className="container">
          <h1 className={sharedStyles.pageTitle}>League Table</h1>
          <p className={sharedStyles.pageSubtitle}>2024/25 Season Standings</p>
        </div>
      </div>

      <div className="container section">
        <ApiState
          loading={loading}
          error={error}
          empty={!loading && table?.length === 0}
          emptyMessage="League table not available yet."
          onRetry={refetch}
        >
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.pos}>#</th>
                  <th className={styles.teamCol}>Team</th>
                  <th>P</th>
                  <th>W</th>
                  <th>D</th>
                  <th>L</th>
                  <th>GF</th>
                  <th>GA</th>
                  <th>GD</th>
                  <th className={styles.pts}>Pts</th>
                </tr>
              </thead>
              <tbody>
                {table?.map((row) => (
                  <tr key={row.pos} className={row.isClub ? styles.clubRow : ''}>
                    <td className={styles.pos}>{row.pos}</td>
                    <td className={styles.teamCol}>
                      {row.isClub ? (
                        <span className={styles.clubName}>
                          <img src={badgeUrl} alt="" className={styles.minibadge} />
                          {row.team}
                        </span>
                      ) : row.team}
                    </td>
                    <td>{row.played}</td>
                    <td>{row.won}</td>
                    <td>{row.drawn}</td>
                    <td>{row.lost}</td>
                    <td>{row.gf}</td>
                    <td>{row.ga}</td>
                    <td className={row.gd > 0 ? styles.gdPos : row.gd < 0 ? styles.gdNeg : ''}>
                      {row.gd > 0 ? `+${row.gd}` : row.gd}
                    </td>
                    <td className={styles.pts}>{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ApiState>
      </div>
    </div>
  );
}
