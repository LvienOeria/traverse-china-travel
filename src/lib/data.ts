import type { Poi, PoiDataFile } from './types';

const cache = new Map<PoiDataFile, Promise<Poi[]>>();

export function loadPois(file: PoiDataFile): Promise<Poi[]> {
  let p = cache.get(file);
  if (!p) {
    p = fetch(`/data/${file}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`加载数据失败: ${file} (HTTP ${r.status})`);
        return r.json();
      })
      .then((arr: Poi[]) => {
        arr.forEach((poi) => {
          poi.kind = file === 'spots' ? 'scenic' : file === 'airports' ? 'airport' : 'station';
        });
        return arr;
      });
    cache.set(file, p);
  }
  return p;
}

export async function loadStats(): Promise<{ spots: number; airports: number; stations: number }> {
  try {
    const r = await fetch('/data/stats.json');
    if (r.ok) return r.json();
  } catch {
    /* ignore */
  }
  return { spots: 0, airports: 0, stations: 0 };
}

const imgCache = new Set<string>();
export function preloadImg(url: string) {
  if (!url || imgCache.has(url)) return;
  imgCache.add(url);
  const im = new Image();
  im.src = url;
}
