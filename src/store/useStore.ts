import { create } from 'zustand';
import type { LandmarkList } from '../types';

interface Store {
  activeFilter: string;
  /** Landmarks for every detected face (one entry per person). */
  faces: LandmarkList[];
  facingMode: 'user' | 'environment';
  isLoaded: boolean;
  capturedImage: string | null;
  frame: number;

  setFilter: (id: string) => void;
  setFaces: (faces: LandmarkList[]) => void;
  setFacingMode: (mode: 'user' | 'environment') => void;
  setLoaded: (v: boolean) => void;
  setCapturedImage: (url: string | null) => void;
  incrementFrame: () => void;
}

export const useStore = create<Store>((set) => ({
  activeFilter: 'none',
  faces: [],
  facingMode: 'user',
  isLoaded: false,
  capturedImage: null,
  frame: 0,

  setFilter: (id) => set({ activeFilter: id }),
  setFaces: (faces) => set({ faces }),
  setFacingMode: (mode) => set({ facingMode: mode }),
  setLoaded: (v) => set({ isLoaded: v }),
  setCapturedImage: (url) => set({ capturedImage: url }),
  incrementFrame: () => set((s) => ({ frame: s.frame + 1 })),
}));
