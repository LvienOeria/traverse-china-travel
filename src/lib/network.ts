import type { GeoPoint } from './types';

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

export interface MapRef {
  project: (p: GeoPoint) => { x: number; y: number } | null;
  toLatLng: (p: { x: number; y: number }) => GeoPoint | null;
}
