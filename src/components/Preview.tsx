import React from 'react';
import { useStore } from '../store/useStore';
import styles from './Preview.module.css';

export const Preview: React.FC = () => {
  const { capturedImage, setCapturedImage } = useStore();

  if (!capturedImage) return null;

  const handleSave = async () => {
    const filename = `snapfilter-${Date.now()}.jpg`;

    // Convert data URL to Blob
    const res = await fetch(capturedImage);
    const blob = await res.blob();

    // Web Share API with files — supported on iOS 15+ and modern Android
    if (navigator.canShare && navigator.canShare({ files: [new File([blob], filename, { type: 'image/jpeg' })] })) {
      try {
        await navigator.share({
          files: [new File([blob], filename, { type: 'image/jpeg' })],
          title: 'Snapfilter foto',
        });
        setCapturedImage(null);
        return;
      } catch (err) {
        // User cancelled share — do nothing
        if ((err as DOMException).name === 'AbortError') return;
      }
    }

    // Fallback: anchor download (works on Android Chrome and desktop)
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setCapturedImage(null);
  };

  return (
    <div className={styles.wrap}>
      <img className={styles.img} src={capturedImage} alt="Foto" />
      <div className={styles.actions}>
        <button className={styles.btn} onClick={() => setCapturedImage(null)}>
          Slet
        </button>
        <button className={`${styles.btn} ${styles.primary}`} onClick={handleSave}>
          Gem
        </button>
      </div>
    </div>
  );
};
