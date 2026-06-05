import { useRef, useEffect, useCallback } from 'react';
import { useStore } from '../store/useStore';

declare global {
  interface Window {
    FaceMesh: unknown;
    MEDIAPIPE_LOAD_ERROR?: string;
  }
}

export function useFaceMesh(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const faceMeshRef = useRef<unknown>(null);
  const busyRef = useRef(false);
  const lastRef = useRef(0);
  const setFaces = useStore(s => s.setFaces);

  const init = useCallback(async () => {
    if (typeof (window as Window).FaceMesh === 'undefined') {
      throw new Error('MediaPipe FaceMesh could not be loaded. Check your internet connection.');
    }
    const FaceMesh = (window as Window).FaceMesh as new (opts: object) => {
      setOptions: (o: object) => void;
      onResults: (cb: (r: { multiFaceLandmarks: unknown[][] }) => void) => void;
      initialize: () => Promise<void>;
      send: (o: object) => Promise<void>;
    };

    const fm = new FaceMesh({
      locateFile: (file: string) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`,
    });
    fm.setOptions({
      maxNumFaces: 4,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    fm.onResults((results) => {
      busyRef.current = false;
      const lms = results.multiFaceLandmarks;
      setFaces((lms ?? []) as Parameters<typeof setFaces>[0]);
    });
    await fm.initialize();
    faceMeshRef.current = fm;
  }, [setFaces]);

  // Detection loop — runs at ~15 fps to save battery
  useEffect(() => {
    let rafId: number;
    const loop = () => {
      rafId = requestAnimationFrame(loop);
      const video = videoRef.current;
      const fm = faceMeshRef.current as { send: (o: object) => Promise<void> } | null;
      if (!fm || busyRef.current || !video?.videoWidth || video.paused) return;
      const now = performance.now();
      if (now - lastRef.current < 66) return;
      lastRef.current = now;
      busyRef.current = true;
      fm.send({ image: video }).catch(() => { busyRef.current = false; });
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [videoRef]);

  return { init };
}
