import React, { useEffect, useRef, useState } from 'react';
import { LAYOUTS } from './layouts';
import { buildScene } from './drawFrame';
import { loadAssets, renderStill, renderVideo } from './exportVideo';
import styles from './ExportPanel.module.css';

const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// "Export for social": renders the reveal at every social size, one after
// another, and offers each as an MP4 plus a PNG of the finished teamsheet.
export default function ExportPanel({
  lineup,
  fixture,
  clubName = 'Denny Warriors',
  badgeUrl = `${process.env.PUBLIC_URL || ''}/badge.png`,
}) {
  const [results, setResults] = useState({});
  const [running, setRunning] = useState(false);
  const urls = useRef([]);
  const runId = useRef(0);

  const revokeAll = () => {
    urls.current.forEach((u) => URL.revokeObjectURL(u));
    urls.current = [];
  };

  // A different lineup makes old exports stale.
  useEffect(() => {
    runId.current += 1;
    revokeAll();
    setResults({});
    setRunning(false);
  }, [lineup, fixture]);

  useEffect(() => revokeAll, []);

  const update = (id, patch) => setResults((r) => ({ ...r, [id]: { ...r[id], ...patch } }));

  async function exportAll() {
    const id = ++runId.current; // eslint-disable-line no-plusplus
    revokeAll();
    setRunning(true);
    setResults(Object.fromEntries(LAYOUTS.map((l) => [l.id, { status: 'waiting', progress: 0 }])));

    const players = [...lineup.starters.map((s) => s.player), ...lineup.substitutes];
    const images = await loadAssets(badgeUrl, players);
    const scene = buildScene({ lineup, fixture, clubName, images });
    const base = slug(`${clubName} v ${scene.opponent} lineup`);

    for (const layout of LAYOUTS) {
      if (runId.current !== id) return;
      update(layout.id, { status: 'rendering' });
      try {
        // eslint-disable-next-line no-await-in-loop
        const video = await renderVideo(layout, scene, (p) => {
          if (runId.current === id) update(layout.id, { progress: p });
        });
        // eslint-disable-next-line no-await-in-loop
        const still = await renderStill(layout, scene);
        if (runId.current !== id) return;
        const videoUrl = URL.createObjectURL(video.blob);
        const stillUrl = URL.createObjectURL(still);
        urls.current.push(videoUrl, stillUrl);
        const name = `${base}-${layout.id}-${layout.ratio.replace(':', 'x')}`;
        update(layout.id, {
          status: 'ready',
          progress: 1,
          videoUrl,
          stillUrl,
          videoName: `${name}.${video.ext}`,
          stillName: `${name}.png`,
          sizeMb: (video.blob.size / 1e6).toFixed(1),
          ext: video.ext,
          note: video.note,
        });
      } catch (err) {
        update(layout.id, { status: 'error', error: err?.message || 'Export failed.' });
      }
    }
    if (runId.current === id) setRunning(false);
  }

  return (
    <section className={styles.panel} aria-labelledby="export-heading">
      <div className={styles.head}>
        <div>
          <h2 id="export-heading" className={styles.title}>Export for social</h2>
          <p className={styles.lede}>
            Makes a video and a still of this lineup in every social size. The video is made on this device, so nothing is uploaded.
          </p>
        </div>
        <button type="button" className={styles.button} onClick={exportAll} disabled={running}>
          {running ? 'Exporting…' : 'Export all sizes'}
        </button>
      </div>

      <ul className={styles.grid}>
        {LAYOUTS.map((layout) => {
          const r = results[layout.id] || {};
          return (
            <li key={layout.id} className={styles.card}>
              <div className={styles.previewArea}>
                <div className={styles.preview} style={{ '--r': layout.width / layout.height }}>
                  {r.status === 'ready' ? (
                    <video src={r.videoUrl} poster={r.stillUrl} controls muted loop playsInline />
                  ) : (
                    <span className={styles.ratio}>{layout.ratio}</span>
                  )}
                </div>
              </div>
              <div className={styles.meta}>
                <div className={styles.name}>
                  {layout.label} <span>{layout.ratio} · {layout.width}×{layout.height}</span>
                </div>
                <div className={styles.use}>{layout.use}</div>
                {r.status === 'rendering' || r.status === 'waiting' ? (
                  <div className={styles.progress} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((r.progress || 0) * 100)}>
                    <div style={{ width: `${Math.round((r.progress || 0) * 100)}%` }} />
                  </div>
                ) : null}
                {r.status === 'error' && <p className={styles.error}>{r.error}</p>}
                {r.note && <p className={styles.note}>{r.note}</p>}
                {r.status === 'ready' && (
                  <div className={styles.links}>
                    <a href={r.videoUrl} download={r.videoName}>Download {r.ext.toUpperCase()} ({r.sizeMb} MB)</a>
                    <a href={r.stillUrl} download={r.stillName}>Download PNG</a>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
