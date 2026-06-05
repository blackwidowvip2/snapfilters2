import React, { useState } from 'react';
import styles from './LoadingScreen.module.css';

interface Props {
  onStart: () => Promise<void>;
}

type Status = 'idle' | 'loading' | 'error';

export const LoadingScreen: React.FC<Props> = ({ onStart }) => {
  const [status, setStatus] = useState<Status>('idle');
  const [detail, setDetail] = useState('Tryk for at give kameratilladelse');
  const [error, setError] = useState('');

  const handleStart = async () => {
    setStatus('loading');
    setDetail('Anmoder om kamera…');
    try {
      await onStart();
    } catch (err: unknown) {
      setStatus('error');
      const e = err as Error & { name?: string };
      let msg = e.message || String(e);
      if (e.name === 'NotAllowedError')  msg = 'Kameratilladelse afvist. Gå til Indstillinger → Safari → Kamera → Tillad.';
      if (e.name === 'NotFoundError')    msg = 'Intet kamera fundet.';
      if (e.name === 'NotReadableError') msg = 'Kameraet bruges af en anden app.';
      if (e.name === 'SecurityError')    msg = 'Siden kræver HTTPS.';
      setError(msg);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>◈</span>
          <span className={styles.logoText}>SNAPFILTERS</span>
        </div>

        <p className={styles.subtitle}>AR Face Filters</p>

        {status === 'loading' && (
          <div className={styles.spinnerWrap}>
            <div className={styles.spinner} />
            <p className={styles.detail}>{detail}</p>
          </div>
        )}

        {status === 'error' && (
          <div className={styles.errorBox}>
            <span className={styles.errorIcon}>⚠</span>
            <p className={styles.errorMsg}>{error}</p>
          </div>
        )}

        {status !== 'loading' && (
          <button className={styles.btn} onClick={handleStart}>
            {status === 'error' ? 'PRØV IGEN' : 'START KAMERA'}
          </button>
        )}
      </div>
    </div>
  );
};
