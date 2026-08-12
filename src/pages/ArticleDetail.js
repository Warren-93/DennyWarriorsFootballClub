import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useArticle } from '../hooks';
import ApiState from '../components/ApiState';
import sharedStyles from './PageShared.module.css';
import styles from './ArticleDetail.module.css';

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default function ArticleDetail() {
  const { slug } = useParams();
  const { data: article, loading, error } = useArticle(slug);

  return (
    <div className={sharedStyles.page}>
      <div className="container section">
        <div className={styles.article}>
          <Link to="/news" className={styles.backLink}>← Back to News</Link>

          <ApiState loading={loading} error={error} empty={!loading && !article} emptyMessage="Article not found.">
            {article && (
              <>
                <div className={styles.meta}>
                  <span className="badge badge-blue">{article.category}</span>
                  <time className={styles.date}>{formatDate(article.date)}</time>
                </div>
                <h1 className={styles.title}>{article.title}</h1>
                <p className={styles.author}>By {article.author}</p>
                {article.imageUrl && (
                  <img src={article.imageUrl} alt={article.title} className={styles.cover} />
                )}
                <p className={styles.body}>{article.content}</p>
              </>
            )}
          </ApiState>
        </div>
      </div>
    </div>
  );
}
