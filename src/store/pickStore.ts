import { create } from 'zustand';
import type { GeoPoint } from '../lib/types';

export type PickMode = null | { kind: 'waypoint'; dayId: string };

interface PickState {
  mode: PickMode;
  requestPick: (mode: NonNullable<PickMode>) => void;
  cancelPick: () => void;
  resolver: ((pt: GeoPoint) => void) | null;
  registerResolver: (fn: ((pt: GeoPoint) => void) | null) => void;
}

export const usePickStore = create<PickState>((set) => ({
  mode: null,
  resolver: null,
  requestPick: (mode) => set({ mode, resolver: null }),
  cancelPick: () => set({ mode: null, resolver: null }),
  registerResolver: (fn) => set({ resolver: fn }),
}));
