import React, { useState } from 'react';
import { YOUTUBE_CHANNEL_ID, YOUTUBE_UPLOADS_PLAYLIST_ID } from '../config/youtube';
import sharedStyles from './PageShared.module.css';
import styles from './Media.module.css';

const TABS = [
  { key: 'videos', label: 'Videos' },
  { key: 'live', label: 'Live' },
];

export default function Media() {
  const [activeTab, setActiveTab] = useState('videos');

  return (
    <div className={sharedStyles.page}>
      <div className={sharedStyles.pageHero}>
        <div className="container">
          <h1 className={sharedStyles.pageTitle}>Media</h1>
          <p className={sharedStyles.pageSubtitle}>Highlights, full matches &amp; live streams</p>
        </div>
      </div>

      <div className="container section">
        <div className={sharedStyles.filterRow}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`${sharedStyles.filterBtn} ${activeTab === tab.key ? sharedStyles.filterActive : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'videos' ? (
          <>
            <p className={styles.sectionCaption}>
              Every video from the club&apos;s YouTube channel — browse the playlist alongside the player.
            </p>
            <div className={styles.videoWrapper}>
              <iframe
                src={`https://www.youtube.com/embed/videoseries?list=${YOUTUBE_UPLOADS_PLAYLIST_ID}`}
                title="Denny Warriors FC videos"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </>
        ) : (
          <>
            <p className={styles.sectionCaption}>
              This player automatically shows our stream whenever we&apos;re live on YouTube.
            </p>
            <div className={styles.videoWrapper}>
              <iframe
                src={`https://www.youtube.com/embed/live_stream?channel=${YOUTUBE_CHANNEL_ID}`}
                title="Denny Warriors FC live stream"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
