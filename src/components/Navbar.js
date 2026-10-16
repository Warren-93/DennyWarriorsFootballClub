import React, { useState, useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import styles from './Navbar.module.css';
import Badge from './Badge';
import useAdminRole from '../hooks/useAdminRole';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/fixtures', label: 'Fixtures' },
  { to: '/results', label: 'Results' },
  { to: '/table', label: 'Table' },
  { to: '/squad', label: 'Squad' },
  { to: '/news', label: 'News' },
  { to: '/history', label: 'History' },
  { to: '/media', label: 'Media' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const badgeUrl = `${process.env.PUBLIC_URL || ''}/badge.png`;
  const { loggedIn } = useAdminRole();
  const adminPath = loggedIn ? '/admin' : '/admin/login';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location]);

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}>
      <div className={`container ${styles.inner}`}>
        {/* Logo */}
        <Link to="/" className={styles.logo}>
          <img src={badgeUrl} alt="Denny Warriors FC Badge" className={styles.badge} />
          <div className={styles.logoText}>
            <span className={styles.logoClub}>Denny Warriors</span>
            <span className={styles.logoSub}>Football Club</span>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className={styles.nav}>
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `${styles.navLink} ${isActive ? styles.active : ''}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* Right side */}
        <div className={styles.actions}>
          <Badge variant="blue" label="2026/27 Season" />
          <Link to={adminPath} className={styles.adminLink}>
            {loggedIn ? 'Admin' : 'Staff login'}
          </Link>
        </div>

        {/* Burger */}
        <button
          className={`${styles.burger} ${menuOpen ? styles.burgerOpen : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className={styles.mobileMenu}>
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `${styles.mobileLink} ${isActive ? styles.mobileLinkActive : ''}`
              }
            >
              {link.label}
            </NavLink>
          ))}
          <NavLink to={adminPath} className={styles.mobileLink}>
            {loggedIn ? 'Admin' : 'Staff login'}
          </NavLink>
        </div>
      )}
    </header>
  );
}
