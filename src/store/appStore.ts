import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppSettings, ListedPoi, Poi, PoiVisibility } from '../lib/types';

interface AppState {
  settings: AppSettings;
  setSettings: (patch: Partial<AppSettings>) => void;

  visibility: PoiVisibility;
  setVisibility: (patch: Partial<PoiVisibility>) => void;

  scenicList: ListedPoi[];
  airportList: ListedPoi[];
  stationList: ListedPoi[];
  addToList: (poi: Poi) => void;
  removeFromList: (kind: keyof PoiVisibility, poiId: string) => void;
  toggleItem: (kind: keyof PoiVisibility, poiId: string) => void;
  toggleListAll: (kind: keyof PoiVisibility) => void;
  clearList: (kind: keyof PoiVisibility) => void;
  isListed: (kind: keyof PoiVisibility, poiId: string) => boolean;
}

const persistConfig = {
  name: 'traverse-app',
  partialize: (s: AppState) => ({
    settings: s.settings,
    scenicList: s.scenicList,
    airportList: s.airportList,
    stationList: s.stationList,
  }),
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      settings: {
        imagery: 'bing',
        terrain: 'arcgis',
        ionToken: '',
        showRoutes: true,
        showWaypoints: true,
        routeThickness: 3,
      },
      setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      visibility: { scenic: true, airport: true, station: true },
      setVisibility: (patch) => set((s) => ({ visibility: { ...s.visibility, ...patch } })),

      scenicList: [],
      airportList: [],
      stationList: [],
      addToList: (poi) =>
        set((s) => {
          const key = poi.kind === 'scenic' ? 'scenicList' : poi.kind === 'airport' ? 'airportList' : 'stationList';
          const list = s[key];
          if (list.some((l) => l.poi.id === poi.id)) return s;
          return { [key]: [{ poi, visible: true, addedAt: Date.now() }, ...list] } as Partial<AppState>;
        }),
      removeFromList: (kind, poiId) =>
        set((s) => {
          const key = kind === 'scenic' ? 'scenicList' : kind === 'airport' ? 'airportList' : 'stationList';
          return { [key]: s[key].filter((l) => l.poi.id !== poiId) } as Partial<AppState>;
        }),
      toggleItem: (kind, poiId) =>
        set((s) => {
          const key = kind === 'scenic' ? 'scenicList' : kind === 'airport' ? 'airportList' : 'stationList';
          return {
            [key]: s[key].map((l) => (l.poi.id === poiId ? { ...l, visible: !l.visible } : l)),
          } as Partial<AppState>;
        }),
      toggleListAll: (kind) =>
        set((s) => {
          const key = kind === 'scenic' ? 'scenicList' : kind === 'airport' ? 'airportList' : 'stationList';
          const all = s[key].length > 0 && s[key].every((l) => l.visible);
          return { [key]: s[key].map((l) => ({ ...l, visible: !all })) } as Partial<AppState>;
        }),
      clearList: (kind) =>
        set(() => {
          const key = kind === 'scenic' ? 'scenicList' : kind === 'airport' ? 'airportList' : 'stationList';
          return { [key]: [] } as Partial<AppState>;
        }),
      isListed: (kind, poiId) => {
        const key = kind === 'scenic' ? 'scenicList' : kind === 'airport' ? 'airportList' : 'stationList';
        return get()[key].some((l) => l.poi.id === poiId);
      },
    }),
    persistConfig as never,
  ),
);

export function listKey(kind: keyof PoiVisibility): 'scenicList' | 'airportList' | 'stationList' {
  return kind === 'scenic' ? 'scenicList' : kind === 'airport' ? 'airportList' : 'stationList';
}
