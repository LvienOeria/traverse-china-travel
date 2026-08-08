import type { Poi } from './types';

const cache = new Map<string, Promise<Poi[]>>();

export function loadPois(file: 'spots'): Promise<Poi[]> {
  let p = cache.get(file);
  if (!p) {
    p = fetch(`/data/${file}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`加载数据失败: ${file} (HTTP ${r.status})`);
        return r.json();
      })
      .then((arr: Poi[]) => arr);
    cache.set(file, p);
  }
  return p;
}

export async function loadStats(): Promise<{ spots: number }> {
  try {
    const r = await fetch('/data/stats.json');
    if (r.ok) {
      const s = await r.json();
      return { spots: s.spots ?? 0 };
    }
  } catch {
    /* ignore */
  }
  return { spots: 0 };
}
