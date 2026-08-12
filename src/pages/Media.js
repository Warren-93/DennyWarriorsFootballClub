import React, { useState } from 'react';
import { YOUTUBE_CHANNEL_ID } from '../config/youtube';
import { useVideos } from '../hooks';
import ApiState from '../components/ApiState';
import sharedStyles from './PageShared.module.css';
import styles from './Media.module.css';

const TABS = [
  { key: 'videos', label: 'Videos' },
  { key: 'live', label: 'Live' },
];

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function VideosGrid() {
  const { data: videos, loading, error, refetch } = useVideos();

  return (
    <>
      <p className={styles.sectionCaption}>
        The club&apos;s recent uploads — edited videos and full broadcast VODs.
      </p>
      <ApiState
        loading={loading}
        error={error}
        empty={!loading && (videos || []).length === 0}
        emptyMessage="No videos published yet."
        onRetry={refetch}
      >
        <div className={styles.grid}>
          {(videos || []).map((video) => (
            <a
              key={video.videoId}
              href={video.watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.card}
            >
              <div className={styles.thumbWrapper}>
                <img src={video.thumbnailUrl} alt={video.title} className={styles.thumb} loading="lazy" />
                <span className={styles.playIcon}>▶</span>
              </div>
              <h3 className={styles.cardTitle}>{video.title}</h3>
              <span className={styles.cardDate}>{formatDate(video.publishedAt)}</span>
            </a>
          ))}
        </div>
      </ApiState>
    </>
  );
}

function LivePanel() {
  return (
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
  );
}

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

        {activeTab === 'videos' ? <VideosGrid /> : <LivePanel />}
      </div>
    </div>
  );
}
