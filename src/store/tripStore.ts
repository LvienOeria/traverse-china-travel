import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DayPlan, Trip, Waypoint } from '../lib/types';
import { DAY_PALETTE, uid } from '../lib/types';

interface TripState {
  trip: Trip | null;
  newTrip: (name?: string) => void;
  deleteTrip: () => void;
  renameTrip: (name: string) => void;

  addDay: () => void;
  removeDay: (dayId: string) => void;
  setDayColor: (dayId: string, color: string) => void;
  setDayLabel: (dayId: string, label: string) => void;

  addWaypoint: (dayId: string, wp: Omit<Waypoint, 'id'>) => void;
  updateWaypoint: (dayId: string, wpId: string, patch: Partial<Waypoint>) => void;
  removeWaypoint: (dayId: string, wpId: string) => void;
  moveWaypoint: (dayId: string, fromIdx: number, toIdx: number) => void;

  importTrip: (json: string) => boolean;
  exportTrip: () => string;
}

function sanitizeTrip(raw: unknown): Trip | null {
  const t = raw as Trip;
  if (!t || !Array.isArray(t.days)) return null;
  return {
    id: t.id || uid('trip'),
    name: t.name || '我的旅程',
    createdAt: t.createdAt || Date.now(),
    days: t.days
      .filter((d) => d && Array.isArray(d.waypoints))
      .map((d) => ({
        id: d.id || uid('day'),
        label: d.label || '第 X 天',
        date: d.date || '',
        color: d.color || DAY_PALETTE[0],
        waypoints: (d.waypoints as Waypoint[])
          .filter((w) => w && typeof w.lat === 'number' && typeof w.lng === 'number')
          .map((w) => ({
            id: w.id || uid('wp'),
            type: w.type || 'custom',
            poiId: w.poiId,
            name: w.name || '途经点',
            lat: w.lat,
            lng: w.lng,
            time: w.time || '09:00',
          })),
      })),
  };
}

export const useTripStore = create<TripState>()(
  persist(
    (set, get) => ({
      trip: null,

      newTrip: (name) =>
        set({
          trip: {
            id: uid('trip'),
            name: name || '我的旅程',
            createdAt: Date.now(),
            days: [],
          },
        }),
      deleteTrip: () => set({ trip: null }),
      renameTrip: (name) =>
        set((s) => (s.trip ? { trip: { ...s.trip, name } } : s)),

      addDay: () =>
        set((s) => {
          if (!s.trip) return { trip: { id: uid('trip'), name: '我的旅程', createdAt: Date.now(), days: [] } };
          const n = s.trip.days.length;
          const color = DAY_PALETTE[n % DAY_PALETTE.length];
          const date = new Date();
          date.setDate(date.getDate() + n);
          const day: DayPlan = {
            id: uid('day'),
            label: `第 ${n + 1} 天`,
            date: date.toISOString().slice(0, 10),
            color,
            waypoints: [],
          };
          return { trip: { ...s.trip, days: [...s.trip.days, day] } };
        }),
      removeDay: (dayId) =>
        set((s) => (s.trip ? { trip: { ...s.trip, days: s.trip.days.filter((d) => d.id !== dayId) } } : s)),
      setDayColor: (dayId, color) =>
        set((s) =>
          s.trip
            ? { trip: { ...s.trip, days: s.trip.days.map((d) => (d.id === dayId ? { ...d, color } : d)) } }
            : s,
        ),
      setDayLabel: (dayId, label) =>
        set((s) =>
          s.trip
            ? { trip: { ...s.trip, days: s.trip.days.map((d) => (d.id === dayId ? { ...d, label } : d)) } }
            : s,
        ),

      addWaypoint: (dayId, wp) =>
        set((s) => {
          if (!s.trip) return s;
          return {
            trip: {
              ...s.trip,
              days: s.trip.days.map((d) =>
                d.id === dayId ? { ...d, waypoints: [...d.waypoints, { ...wp, id: uid('wp') }] } : d,
              ),
            },
          };
        }),
      updateWaypoint: (dayId, wpId, patch) =>
        set((s) => {
          if (!s.trip) return s;
          return {
            trip: {
              ...s.trip,
              days: s.trip.days.map((d) =>
                d.id === dayId
                  ? { ...d, waypoints: d.waypoints.map((w) => (w.id === wpId ? { ...w, ...patch } : w)) }
                  : d,
              ),
            },
          };
        }),
      removeWaypoint: (dayId, wpId) =>
        set((s) => {
          if (!s.trip) return s;
          return {
            trip: {
              ...s.trip,
              days: s.trip.days.map((d) =>
                d.id === dayId ? { ...d, waypoints: d.waypoints.filter((w) => w.id !== wpId) } : d,
              ),
            },
          };
        }),
      moveWaypoint: (dayId, fromIdx, toIdx) =>
        set((s) => {
          if (!s.trip) return s;
          return {
            trip: {
              ...s.trip,
              days: s.trip.days.map((d) => {
                if (d.id !== dayId) return d;
                const wps = [...d.waypoints];
                const [m] = wps.splice(fromIdx, 1);
                wps.splice(toIdx, 0, m);
                return { ...d, waypoints: wps };
              }),
            },
          };
        }),

      importTrip: (json) => {
        try {
          const t = sanitizeTrip(JSON.parse(json));
          if (!t) return false;
          set({ trip: t });
          return true;
        } catch {
          return false;
        }
      },
      exportTrip: () => JSON.stringify(get().trip, null, 2),
    }),
    {
      name: 'traverse-trip',
      merge: (persisted, current): TripState => {
        const p = persisted as { state?: { trip?: unknown } };
        if (p?.state?.trip) {
          const t = sanitizeTrip(p.state.trip);
          if (t) return { ...(current as TripState), trip: t };
        }
        return current as TripState;
      },
    },
  ),
);
