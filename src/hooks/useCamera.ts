import { useRef, useCallback } from 'react';
import { useStore } from '../store/useStore';

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { facingMode, setFacingMode } = useStore();

  const startCamera = useCallback(async (mode: 'user' | 'environment') => {
    const video = videoRef.current;
    if (!video) return;

    // Stop existing tracks
    if (video.srcObject) {
      (video.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      video.srcObject = null;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: mode,
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 },
      },
    });

    video.srcObject = stream;
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = reject;
      setTimeout(reject, 10_000);
    });
    await video.play();
  }, []);

  const flipCamera = useCallback(async () => {
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    await startCamera(next).catch(console.warn);
  }, [facingMode, setFacingMode, startCamera]);

  return { videoRef, startCamera, flipCamera };
}
