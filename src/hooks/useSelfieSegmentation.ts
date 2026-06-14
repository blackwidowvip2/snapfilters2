import { useRef, useEffect, useCallback } from 'react';
import { setPersonMask } from '../lib/personMask';

declare global {
  interface Window {
    SelfieSegmentation?: unknown;
  }
}

// MediaPipe Selfie Segmentation — produces a per-frame mask of the person
// (including hair), written to the shared personMask singleton so filters can
// crop themselves to the real silhouette.
export function useSelfieSegmentation(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const segRef = useRef<unknown>(null);
  const busyRef = useRef(false);
  const lastRef = useRef(0);

  const init = useCallback(async () => {
    if (typeof window.SelfieSegmentation === 'undefined') {
      // Segmentation is optional — filters fall back to a geometric crop.
      return;
    }
    const SelfieSegmentation = window.SelfieSegmentation as new (opts: object) => {
      setOptions: (o: object) => void;
      onResults: (cb: (r: { segmentationMask: CanvasImageSource }) => void) => void;
      initialize: () => Promise<void>;
      send: (o: object) => Promise<void>;
    };

    const seg = new SelfieSegmentation({
      locateFile: (file: string) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@0.1.1675465747/${file}`,
    });
    // model 1 = landscape/general (256×256), good quality for a head-and-shoulders
    // selfie and fast enough at our throttled rate.
    seg.setOptions({ modelSelection: 1, selfieMode: false });
    seg.onResults((results) => {
      busyRef.current = false;
      const video = videoRef.current;
      if (results.segmentationMask && video?.videoWidth) {
        setPersonMask(results.segmentationMask, video.videoWidth, video.videoHeight);
      }
    });
    await seg.initialize();
    segRef.current = seg;
  }, [videoRef]);

  // Run at ~12 fps — the silhouette changes slowly, so this saves battery.
  useEffect(() => {
    let rafId: number;
    const loop = () => {
      rafId = requestAnimationFrame(loop);
      const video = videoRef.current;
      const seg = segRef.current as { send: (o: object) => Promise<void> } | null;
      if (!seg || busyRef.current || !video?.videoWidth || video.paused) return;
      const now = performance.now();
      if (now - lastRef.current < 80) return;
      lastRef.current = now;
      busyRef.current = true;
      seg.send({ image: video }).catch(() => { busyRef.current = false; });
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [videoRef]);

  return { init };
}
