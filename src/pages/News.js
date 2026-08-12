import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNews } from '../hooks';
import ApiState from '../components/ApiState';
import sharedStyles from './PageShared.module.css';
import styles from './News.module.css';

const categories = ['All', 'Match Report', 'Club News', 'Announcement'];

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default function News() {
  const [filter, setFilter] = useState('All');

  // Fetch all articles; filter client-side for instant tab switching
  const { data: articles, loading, error, refetch } = useNews();

  const filtered = !articles
    ? []
    : filter === 'All'
      ? articles
      : articles.filter(n => n.category === filter);

  return (
    <div className={sharedStyles.page}>
      <div className={sharedStyles.pageHero}>
        <div className="container">
          <h1 className={sharedStyles.pageTitle}>News</h1>
          <p className={sharedStyles.pageSubtitle}>Club updates & match reports</p>
        </div>
      </div>

      <div className="container section">
        <div className={styles.filters}>
          {categories.map(cat => (
            <button
              key={cat}
              className={`${styles.filterBtn} ${filter === cat ? styles.filterActive : ''}`}
              onClick={() => setFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <ApiState
          loading={loading}
          error={error}
          empty={!loading && filtered.length === 0}
          emptyMessage="No articles in this category yet."
          onRetry={refetch}
        >
          <div className={styles.grid}>
            {filtered.map(item => (
              <article key={item.id} className={styles.card}>
                <div className={styles.cardMeta}>
                  <span className="badge badge-blue">{item.category}</span>
                  <time className={styles.date}>{formatDate(item.date)}</time>
                </div>
                <h2 className={styles.title}>{item.title}</h2>
                <p className={styles.excerpt}>{item.excerpt}</p>
                <div className={styles.footer}>
                  <span className={styles.author}>By {item.author}</span>
                  <Link to={`/news/${item.slug}`} className={styles.readMore}>Read more →</Link>
                </div>
              </article>
            ))}
          </div>
        </ApiState>
      </div>
    </div>
  );
}
