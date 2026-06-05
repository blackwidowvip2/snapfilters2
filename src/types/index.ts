export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export type LandmarkList = Landmark[];

export interface FaceResults {
  multiFaceLandmarks: LandmarkList[];
}

export type FilterCategory = 'animal' | 'makeup' | 'character' | 'style' | 'effect' | 'props' | 'distortion';

export interface FilterDefinition {
  id: string;
  label: string;
  icon: string;
  category: FilterCategory;
  description: string;
}

export interface AppState {
  activeFilter: string;
  faces: LandmarkList[];
  facingMode: 'user' | 'environment';
  isLoaded: boolean;
  isCapturing: boolean;
  capturedImage: string | null;
  frame: number;
}
