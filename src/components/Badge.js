import React from 'react';

export default function Badge({ label, variant = 'blue' }) {
  return (
    <span className={`badge badge-${variant}`}>{label}</span>
  );
}
