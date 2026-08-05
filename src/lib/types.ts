/// <reference types="vite/client" />

export type PoiKind = 'scenic' | 'airport' | 'station';

export interface Poi {
  id: string;
  name: string;
  en: string;
  lat: number;
  lng: number;
  img: string;
  kind: PoiKind;
  code?: string;
  hsr?: boolean;
}

export type PoiDataFile = 'spots' | 'airports' | 'stations';

export interface PoiVisibility {
  scenic: boolean;
  airport: boolean;
  station: boolean;
}

export interface ListedPoi {
  poi: Poi;
  visible: boolean;
  addedAt: number;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface RouteOption {
  distanceKm: number;
  durationMin: number;
  geometry: GeoPoint[];
  source: 'osrm' | 'drawn' | 'geodesic';
}

export type WaypointType = 'poi' | 'custom' | 'drawn';

export interface Waypoint {
  id: string;
  type: WaypointType;
  poiId?: string;
  name: string;
  lat: number;
  lng: number;
  /** HH:mm arrival time */
  time: string;
  note?: string;
}

export interface SegmentPlan {
  fromId: string;
  toId: string;
  routes: RouteOption[];
  chosen: number | null;
  loading?: boolean;
  error?: string;
}

export interface DayPlan {
  id: string;
  label: string;
  date: string;
  color: string;
  waypoints: Waypoint[];
  segments: SegmentPlan[];
  direction: 'forward' | 'reverse';
  /** elevation profile for selected routes */
  routeDrawn: GeoPoint[][];
}

export interface Trip {
  id: string;
  name: string;
  createdAt: number;
  days: DayPlan[];
}

export interface AppSettings {
  imagery: 'bing' | 'osm' | 'carto';
  terrain: 'arcgis' | 'ion' | 'flat';
  ionToken: string;
  showRoutes: boolean;
  showWaypoints: boolean;
  routeThickness: number;
}

export const DAY_PALETTE = [
  '#F2A93B', // amber
  '#4FB8A6', // teal
  '#B98AE8', // violet
  '#E8796C', // coral
  '#5FA8E8', // sky
  '#E8C86C', // gold
  '#7FD468', // leaf
  '#E8759B', // rose
];

export const TIME_OF_DAY = [
  { t: 0, color: '#2E3A59' },  // 深夜
  { t: 5, color: '#4A5A8C' },
  { t: 6, color: '#8E7BB8' },
  { t: 7, color: '#E89A5A' },  // 清晨日出
  { t: 9, color: '#F2C979' },
  { t: 12, color: '#FBF3DC' }, // 正午
  { t: 15, color: '#F2C979' },
  { t: 17, color: '#E89A5A' },
  { t: 19, color: '#8E7BB8' }, // 黄昏
  { t: 21, color: '#4A5A8C' },
  { t: 24, color: '#2E3A59' },
];

export function timeColor(hour: number, min = 0): string {
  const t = hour + min / 60;
  for (let i = 0; i < TIME_OF_DAY.length - 1; i++) {
    const a = TIME_OF_DAY[i];
    const b = TIME_OF_DAY[i + 1];
    if (t >= a.t && t <= b.t) {
      const k = (t - a.t) / (b.t - a.t || 1);
      return mixHex(a.color, b.color, k);
    }
  }
  return TIME_OF_DAY[0].color;
}

/** timeColor for "HH:mm" strings */
export function timeColorStr(t: string): string {
  const [h, m] = (t || '08:00').split(':').map(Number);
  return timeColor(h || 8, m || 0);
}

export function hourOf(t: string): number {
  const [h] = (t || '08:00').split(':').map(Number);
  return h || 8;
}

export function mixHex(c1: string, c2: string, k: number): string {
  const p = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const a = p(c1);
  const b = p(c2);
  const m = a.map((v, i) => Math.round(v + (b[i] - v) * k));
  return `#${m.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

export function hexToRgba(hex: string, alpha: number): string {
  const p = [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
  return `rgba(${p[0]},${p[1]},${p[2]},${alpha})`;
}

export function uid(prefix = 'id'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function fmtMin(min: number): string {
  if (min < 60) return `${Math.round(min)} 分钟`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m ? `${h} 小时 ${m} 分` : `${h} 小时`;
}

export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
