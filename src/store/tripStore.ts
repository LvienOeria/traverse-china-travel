import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DayPlan, RouteOption, SegmentPlan, Trip, Waypoint } from '../lib/types';
import { DAY_PALETTE, uid } from '../lib/types';
import { fallbackRoute, fetchTopRoutes } from '../lib/network';

interface TripState {
  trip: Trip | null;
  newTrip: (name?: string) => void;
  deleteTrip: () => void;
  renameTrip: (name: string) => void;

  addDay: () => void;
  removeDay: (dayId: string) => void;
  setDayColor: (dayId: string, color: string) => void;
  setDayLabel: (dayId: string, label: string) => void;
  setDayDirection: (dayId: string, dir: 'forward' | 'reverse') => void;

  addWaypoint: (dayId: string, wp: Omit<Waypoint, 'id'>) => void;
  updateWaypoint: (dayId: string, wpId: string, patch: Partial<Waypoint>) => void;
  removeWaypoint: (dayId: string, wpId: string) => void;
  moveWaypoint: (dayId: string, fromIdx: number, toIdx: number) => void;

  ensureSegments: (dayId: string) => Promise<void>;
  chooseRoute: (dayId: string, segIdx: number, routeIdx: number | null) => void;
  setDrawnRoute: (dayId: string, segIdx: number, geometry: RouteOption) => void;
  pickBestRoutes: (dayId: string) => void;

  importTrip: (json: string) => boolean;
  exportTrip: () => string;
}

function buildSegments(wps: Waypoint[]): SegmentPlan[] {
  const segs: SegmentPlan[] = [];
  for (let i = 0; i < wps.length - 1; i++) {
    segs.push({ fromId: wps[i].id, toId: wps[i + 1].id, routes: [], chosen: null });
  }
  return segs;
}

async function fetchDaySegments(day: DayPlan): Promise<SegmentPlan[]> {
  const wps = day.waypoints;
  const segs: SegmentPlan[] = [];
  for (let i = 0; i < wps.length - 1; i++) {
    const a = wps[i];
    const b = wps[i + 1];
    const old = day.segments[i];
    let routes: RouteOption[] = [];
    if (old?.chosen === -1 && old?.routes.length && old.routes[0].source === 'drawn') {
      routes = old.routes; // keep user-drawn
    } else {
      routes = await fetchTopRoutes(a, b);
      if (routes.length === 0) {
        routes = [
          {
            distanceKm: 0,
            durationMin: 0,
            geometry: fallbackRoute(a, b),
            source: 'geodesic',
          },
        ];
      }
      if (old?.chosen === null) {
        // keep previous selection if segment unchanged
      }
    }
    segs.push({
      fromId: a.id,
      toId: b.id,
      routes,
      chosen: routes.length ? (old?.chosen ?? 0) : null,
    });
  }
  return segs;
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
            segments: [],
            direction: 'forward',
            routeDrawn: [],
          };
          return { trip: { ...s.trip, days: [...s.trip.days, day] } };
        }),
      removeDay: (dayId) =>
        set((s) => (s.trip ? { trip: { ...s.trip, days: s.trip.days.filter((d) => d.id !== dayId) } } : s)),
      setDayColor: (dayId, color) =>
        set((s) =>
          s.trip
            ? {
                trip: {
                  ...s.trip,
                  days: s.trip.days.map((d) => (d.id === dayId ? { ...d, color } : d)),
                },
              }
            : s,
        ),
      setDayLabel: (dayId, label) =>
        set((s) =>
          s.trip
            ? {
                trip: {
                  ...s.trip,
                  days: s.trip.days.map((d) => (d.id === dayId ? { ...d, label } : d)),
                },
              }
            : s,
        ),
      setDayDirection: (dayId, dir) =>
        set((s) => {
          if (!s.trip) return s;
          return {
            trip: {
              ...s.trip,
              days: s.trip.days.map((d) => {
                if (d.id !== dayId) return d;
                const wps = [...d.waypoints].reverse();
                return {
                  ...d,
                  direction: dir,
                  waypoints: wps,
                  segments: buildSegments(wps),
                };
              }),
            },
          };
        }),

      addWaypoint: (dayId, wp) =>
        set((s) => {
          if (!s.trip) return s;
          return {
            trip: {
              ...s.trip,
              days: s.trip.days.map((d) => {
                if (d.id !== dayId) return d;
                const waypoints = [...d.waypoints, { ...wp, id: uid('wp') }];
                return { ...d, waypoints, segments: buildSegments(waypoints) };
              }),
            },
          };
        }),
      updateWaypoint: (dayId, wpId, patch) =>
        set((s) => {
          if (!s.trip) return s;
          return {
            trip: {
              ...s.trip,
              days: s.trip.days.map((d) => {
                if (d.id !== dayId) return d;
                const wps = d.waypoints.map((w) => (w.id === wpId ? { ...w, ...patch } : w));
                const moved = d.waypoints.some(
                  (w) =>
                    w.id === wpId &&
                    ((patch.lat != null && patch.lat !== w.lat) || (patch.lng != null && patch.lng !== w.lng)),
                );
                return { ...d, waypoints: wps, segments: moved ? buildSegments(wps) : d.segments };
              }),
            },
          };
        }),
      removeWaypoint: (dayId, wpId) =>
        set((s) => {
          if (!s.trip) return s;
          return {
            trip: {
              ...s.trip,
              days: s.trip.days.map((d) => {
                if (d.id !== dayId) return d;
                const waypoints = d.waypoints.filter((w) => w.id !== wpId);
                return { ...d, waypoints, segments: buildSegments(waypoints) };
              }),
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
                return { ...d, waypoints: wps, segments: buildSegments(wps) };
              }),
            },
          };
        }),

      ensureSegments: async (dayId) => {
        const s = get();
        const day = s.trip?.days.find((d) => d.id === dayId);
        if (!day || day.waypoints.length < 2) return;
        const keys = day.segments.map((seg) => `${seg.fromId}>${seg.toId}`).join('|');
        const newKeys = day.waypoints
          .slice(0, -1)
          .map((w, i) => `${w.id}>${day.waypoints[i + 1].id}`)
          .join('|');
        if (keys === newKeys && day.segments.every((seg) => seg.routes.length > 0)) return;
        const segs = await fetchDaySegments(day);
        set((st) => {
          if (!st.trip) return st;
          return {
            trip: {
              ...st.trip,
              days: st.trip.days.map((d) => (d.id === dayId ? { ...d, segments: segs } : d)),
            },
          };
        });
      },

      chooseRoute: (dayId, segIdx, routeIdx) =>
        set((s) => {
          if (!s.trip) return s;
          return {
            trip: {
              ...s.trip,
              days: s.trip.days.map((d) => {
                if (d.id !== dayId) return d;
                const segments = d.segments.map((seg, i) => (i === segIdx ? { ...seg, chosen: routeIdx } : seg));
                return { ...d, segments };
              }),
            },
          };
        }),

      setDrawnRoute: (dayId, segIdx, route) =>
        set((s) => {
          if (!s.trip) return s;
          return {
            trip: {
              ...s.trip,
              days: s.trip.days.map((d) => {
                if (d.id !== dayId) return d;
                const segments = d.segments.map((seg, i) =>
                  i === segIdx ? { ...seg, routes: [route], chosen: 0 } : seg,
                );
                return { ...d, segments };
              }),
            },
          };
        }),

      pickBestRoutes: (dayId) =>
        set((s) => {
          if (!s.trip) return s;
          return {
            trip: {
              ...s.trip,
              days: s.trip.days.map((d) => {
                if (d.id !== dayId) return d;
                return {
                  ...d,
                  segments: d.segments.map((seg) => (seg.chosen === null ? { ...seg, chosen: 0 } : seg)),
                };
              }),
            },
          };
        }),

      importTrip: (json) => {
        try {
          const t = JSON.parse(json) as Trip;
          if (!t || !Array.isArray(t.days)) return false;
          t.days.forEach((d) => {
            d.segments = d.segments ?? buildSegments(d.waypoints ?? []);
          });
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
    },
  ),
);
