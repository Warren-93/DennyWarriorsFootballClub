import React from 'react';
import { Link } from 'react-router-dom';
import sharedStyles from './PageShared.module.css';

export default function NotFound() {
  return (
    <div className={sharedStyles.page}>
      <div className={sharedStyles.pageHero}>
        <div className="container">
          <h1 className={sharedStyles.pageTitle}>Page not found</h1>
        </div>
      </div>
      <div className="container section">
        <p className="section-subtitle">That page doesn&apos;t exist, or has moved.</p>
        <Link to="/" className="btn btn-primary">Back to the home page</Link>
      </div>
    </div>
  );
}
