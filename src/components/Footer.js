import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Footer.module.css';

export default function Footer() {
  const year = new Date().getFullYear();
  const badgeUrl = `${process.env.PUBLIC_URL || ''}/badge.png`;
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.brand}>
          <img src={badgeUrl} alt="Denny Warriors FC" className={styles.badge} />
          <div>
            <p className={styles.name}>Denny Warriors F.C.</p>
            <p className={styles.tagline}>Pride of Denny · Est. 2020</p>
          </div>
        </div>

        <div className={styles.links}>
          <div className={styles.linkGroup}>
            <p className={styles.linkGroupTitle}>Club</p>
            <Link to="/squad">Squad</Link>
            <Link to="/news">News</Link>
            <Link to="/admin/login">Admin</Link>
          </div>
          <div className={styles.linkGroup}>
            <p className={styles.linkGroupTitle}>Matches</p>
            <Link to="/fixtures">Fixtures</Link>
            <Link to="/results">Results</Link>
            <Link to="/table">Table</Link>
          </div>
          <div className={styles.linkGroup}>
            <p className={styles.linkGroupTitle}>Contact</p>
            <a href="mailto:info@dennywarriorsfc.com">Email Us</a>
            <a href="https://www.facebook.com/" target="_blank" rel="noreferrer">Facebook</a>
            <a href="https://www.instagram.com/" target="_blank" rel="noreferrer">Instagram</a>
          </div>
        </div>
      </div>

      <div className={styles.bottom}>
        <p>© {year} Denny Warriors F.C. All rights reserved.</p>
      </div>
    </footer>
  );
}
