import React, { useRef, useCallback } from 'react';
import { useStore } from './store/useStore';
import { useCamera } from './hooks/useCamera';
import { useFaceMesh } from './hooks/useFaceMesh';
import { useRender } from './hooks/useRender';
import { useThreeRenderer } from './hooks/useThreeRenderer';
import { LoadingScreen } from './components/LoadingScreen';
import { FilterBar } from './components/FilterBar';
import { Preview } from './components/Preview';
import { FILTERS } from './filters/registry';
import styles from './App.module.css';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const threeCanvasRef = useRef<HTMLCanvasElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);

  const { isLoaded, setLoaded, activeFilter, setCapturedImage } = useStore();
  const { videoRef, startCamera, flipCamera } = useCamera();
  const { init: initFaceMesh } = useFaceMesh(videoRef);
  useRender(videoRef, canvasRef);
  useThreeRenderer(videoRef, threeCanvasRef);

  // ── Boot sequence ────────────────────────────────────────
  const handleStart = useCallback(async () => {
    await startCamera('user');
    await initFaceMesh();
    setLoaded(true);
  }, [startCamera, initFaceMesh, setLoaded]);

  // ── Capture ──────────────────────────────────────────────
  const handleCapture = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Flash
    const flash = flashRef.current;
    if (flash) {
      flash.style.opacity = '1';
      setTimeout(() => { flash.style.opacity = '0'; }, 100);
    }

    // Snapshot: un-mirror the 2D canvas, then composite Three.js on top
    const snap = document.createElement('canvas');
    snap.width  = canvas.width;
    snap.height = canvas.height;
    const sc = snap.getContext('2d')!;
    sc.scale(-1, 1);
    sc.drawImage(canvas, -snap.width, 0);
    sc.setTransform(1, 0, 0, 1, 0, 0); // reset transform
    const threeCanvas = threeCanvasRef.current;
    if (threeCanvas && threeCanvas.width > 0) {
      // Three.js canvas is already in correct (un-mirrored) orientation
      sc.scale(-1, 1);
      sc.drawImage(threeCanvas, -snap.width, 0);
    }
    setCapturedImage(snap.toDataURL('image/jpeg', 0.92));
  }, [setCapturedImage]);

  // ── Active filter name ───────────────────────────────────
  const activeDef = FILTERS.find(f => f.id === activeFilter);
  const filterLabel = activeDef ? activeDef.label.toUpperCase() : 'INGEN';

  return (
    <div className={styles.app}>
      {/* Camera layers */}
      <video
        ref={videoRef}
        className={styles.video}
        playsInline
        autoPlay
        muted
      />
      <canvas ref={canvasRef} className={styles.canvas} />
      <canvas ref={threeCanvasRef} className={styles.canvas} style={{ pointerEvents: 'none' }} />

      {/* Flash overlay */}
      <div ref={flashRef} className={styles.flash} />

      {/* UI chrome */}
      {isLoaded && (
        <div className={styles.ui}>
          {/* Top bar */}
          <div className={styles.topbar}>
            <span className={styles.appTitle}>SNAPFILTERS</span>
            <span className={styles.filterName}>{filterLabel}</span>
            <button className={styles.flipBtn} onClick={flipCamera} aria-label="Skift kamera">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
                   strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 7h4l2-3h6l2 3h4a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z"/>
                <circle cx="12" cy="13" r="3.5"/>
              </svg>
            </button>
          </div>

          {/* Bottom controls */}
          <div className={styles.bottom}>
            <FilterBar />
            <div className={styles.shutterRow}>
              <button className={styles.shutter} onClick={handleCapture} aria-label="Tag billede" />
            </div>
          </div>
        </div>
      )}

      {/* Loading screen */}
      {!isLoaded && <LoadingScreen onStart={handleStart} />}

      {/* Photo preview */}
      <Preview />
    </div>
  );
};

export default App;
