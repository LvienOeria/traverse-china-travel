import type { GeoPoint, RouteOption } from './types';
import { haversineKm } from './types';

const OSRM_ENDPOINT = 'https://router.project-osrm.org/route/v1/driving';
let lastReq = 0;
const MIN_GAP = 650;

async function throttle() {
  const wait = Math.max(0, lastReq + MIN_GAP - Date.now());
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastReq = Date.now();
}

/**
 * OSRM top-3 alternative routes between two points.
 * Returns [] on failure (caller falls back to geodesic).
 */
export async function fetchTopRoutes(a: GeoPoint, b: GeoPoint): Promise<RouteOption[]> {
  const coordStr = `${a.lng},${a.lat};${b.lng},${b.lat}`;
  const url =
    `${OSRM_ENDPOINT}/${coordStr}?alternatives=3&overview=full&geometries=geojson&steps=false` +
    `&annotations=duration`;
  await throttle();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(25000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.code !== 'Ok' || !json.routes?.length) throw new Error(json.message || json.code);
    return json.routes.map((r: { distance: number; duration: number; geometry: { coordinates: number[][] } }) => ({
      distanceKm: r.distance / 1000,
      durationMin: r.duration / 60,
      geometry: r.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
      source: 'osrm' as const,
    }));
  } catch {
    return [];
  }
}

/** Great-circle fallback: dense interpolated geodesic between two points. */
export function fallbackRoute(a: GeoPoint, b: GeoPoint, segments = 64): GeoPoint[] {
  const pts: GeoPoint[] = [];
  for (let i = 0; i <= segments; i++) {
    const k = i / segments;
    pts.push({
      lat: a.lat + (b.lat - a.lat) * k,
      lng: a.lng + (b.lng - a.lng) * k,
    });
  }
  return pts;
}

export function routeOptionFromGeometry(a: GeoPoint, b: GeoPoint, geometry: GeoPoint[]): RouteOption {
  const d = haversineKm(a, b);
  return {
    distanceKm: d,
    durationMin: (d / 60) * 60,
    geometry,
    source: 'drawn',
  };
}

export interface GeocodeResult {
  name: string;
  lat: number;
  lng: number;
  type: string;
}

let lastGeocode = 0;
export async function geocodeQuery(q: string): Promise<GeocodeResult[]> {
  const wait = Math.max(0, lastGeocode + 1200 - Date.now());
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastGeocode = Date.now();
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&accept-language=zh-CN,zh&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const arr = await res.json();
    return arr.map((r: { display_name: string; lat: string; lon: string; type: string }) => ({
      name: r.display_name.split(',').slice(0, 2).reverse().join(' '),
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      type: r.type,
    }));
  } catch {
    return [];
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const wait = Math.max(0, lastGeocode + 1200 - Date.now());
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastGeocode = Date.now();
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&accept-language=zh-CN,zh&lat=${lat}&lon=${lng}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const j = await res.json();
    const name = j.name || j.display_name?.split(',').slice(0, 2).reverse().join(' ') || '';
    return name || `位置 ${lat.toFixed(3)}, ${lng.toFixed(3)}`;
  } catch {
    return `位置 ${lat.toFixed(3)}, ${lng.toFixed(3)}`;
  }
}
