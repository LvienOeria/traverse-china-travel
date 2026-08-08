import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppSettings, ListedPoi, Poi } from '../lib/types';

export interface LocateTarget {
  lat: number;
  lng: number;
  name: string;
}

interface AppState {
  settings: AppSettings;
  setSettings: (patch: Partial<AppSettings>) => void;

  showPois: boolean;
  setShowPois: (v: boolean) => void;

  locateTarget: LocateTarget | null;
  setLocateTarget: (t: LocateTarget | null) => void;

  scenicList: ListedPoi[];
  addToList: (poi: Poi) => void;
  removeFromList: (poiId: string) => void;
  toggleItem: (poiId: string) => void;
  toggleListAll: () => void;
  clearList: () => void;
  isListed: (poiId: string) => boolean;
}

const persistConfig = {
  name: 'traverse-app',
  partialize: (s: AppState) => ({
    settings: s.settings,
    scenicList: s.scenicList,
  }),
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      settings: {
        imagery: 'amap',
        showWaypoints: true,
      },
      setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      showPois: true,
      setShowPois: (v) => set({ showPois: v }),

      locateTarget: null,
      setLocateTarget: (t) => set({ locateTarget: t }),

      scenicList: [],
      addToList: (poi) =>
        set((s) => {
          if (s.scenicList.some((l) => l.poi.id === poi.id)) return s;
          return { scenicList: [{ poi, visible: true, addedAt: Date.now() }, ...s.scenicList] };
        }),
      removeFromList: (poiId) =>
        set((s) => ({ scenicList: s.scenicList.filter((l) => l.poi.id !== poiId) })),
      toggleItem: (poiId) =>
        set((s) => ({
          scenicList: s.scenicList.map((l) => (l.poi.id === poiId ? { ...l, visible: !l.visible } : l)),
        })),
      toggleListAll: () =>
        set((s) => {
          const all = s.scenicList.length > 0 && s.scenicList.every((l) => l.visible);
          return { scenicList: s.scenicList.map((l) => ({ ...l, visible: !all })) };
        }),
      clearList: () => set({ scenicList: [] }),
      isListed: (poiId) => get().scenicList.some((l) => l.poi.id === poiId),
    }),
    persistConfig,
  ),
);
