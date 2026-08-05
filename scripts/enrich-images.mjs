/**
 * Enrich POIs without images via zh.wikipedia pageimages API (batched, retried).
 * Tries title variants: original name, name with common suffixes stripped.
 * Writes img URLs back into spots.json / stations.json / airports.json.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const OUT = new URL('../public/data/', import.meta.url).pathname;

const SUFFIX_RE = /(风景名胜区|国家森林公园|森林公园|风景区|名胜区|游览区|旅游度假区|自然保护区|国家级自然保护区|景区|公园|博物馆|遗址|古镇|古城|广场|大峡谷|大瀑布|动物园|植物园|老街|步行街|文化街区|历史街区|村|岛|山|湖|寺|塔|楼|桥|宫|陵|庙|祠|洞|滩|湾|峰|泉|海|城|园|江|河|溪|瀑布)$/;

function titleVariants(name) {
  const v = [name];
  let cur = name;
  for (let i = 0; i < 3; i++) {
    const next = cur.replace(SUFFIX_RE, '');
    if (next === cur || next.length < 2) break;
    v.push(next);
    cur = next;
  }
  return v;
}

async function batchThumbs(titles) {
  const out = new Map();
  for (let i = 0; i < titles.length; i += 40) {
    const chunk = titles.slice(i, i + 40);
    const url =
      'https://zh.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&piprop=thumbnail' +
      '&pithumbsize=480&redirects=1&titles=' +
      encodeURIComponent(chunk.join('|'));
    let ok = false;
    for (let attempt = 1; attempt <= 5 && !ok; attempt++) {
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': 'traverse-china-travel-planner/1.0 (data build script)' },
          signal: AbortSignal.timeout(30000),
        });
        if (res.status === 429 || res.status >= 500) {
          await new Promise((r) => setTimeout(r, 4000 * attempt));
          continue;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const pages = json.query?.pages ?? {};
        for (const p of Object.values(pages)) {
          const title = p.title;
          if (p.thumbnail?.source) out.set(title, p.thumbnail.source);
        }
        ok = true;
        console.log(`  batch ${i / 40 + 1}/${Math.ceil(titles.length / 40)} ok`);
      } catch (e) {
        if (attempt === 5) console.warn(`  batch ${i / 40 + 1} failed: ${e.message}`);
        await new Promise((r) => setTimeout(r, 4000 * attempt));
      }
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  return out;
}

async function enrich(list, filter) {
  const missing = list.filter(filter);
  console.log(`missing: ${missing.length}`);
  const variants = new Map();
  const all = [];
  for (const s of missing) {
    const vs = titleVariants(s.name);
    variants.set(s.id, vs);
    all.push(...vs);
  }
  const uniq = [...new Set(all)];
  const map = await batchThumbs(uniq);
  let got = 0;
  for (const s of missing) {
    for (const v of variants.get(s.id)) {
      if (map.get(v)) {
        s.img = map.get(v);
        got++;
        break;
      }
    }
  }
  console.log(`enriched: ${got}/${missing.length}`);
  return got;
}

const spots = JSON.parse(readFileSync(OUT + 'spots.json', 'utf8'));
console.log('spots');
await enrich(spots, (s) => !s.img);
writeFileSync(OUT + 'spots.json', JSON.stringify(spots));

const stations = JSON.parse(readFileSync(OUT + 'stations.json', 'utf8'));
console.log('hsr stations');
await enrich(stations, (s) => !s.img && s.hsr);
writeFileSync(OUT + 'stations.json', JSON.stringify(stations));

const airports = JSON.parse(readFileSync(OUT + 'airports.json', 'utf8'));
console.log('airports');
await enrich(airports, (s) => !s.img);
writeFileSync(OUT + 'airports.json', JSON.stringify(airports));

const stats = {
  spots: spots.length,
  airports: airports.length,
  stations: stations.length,
  spotsWithImg: spots.filter((s) => s.img).length,
  stationsWithImg: stations.filter((s) => s.img).length,
  airportsWithImg: airports.filter((s) => s.img).length,
};
writeFileSync(OUT + 'stats.json', JSON.stringify(stats));
console.log('DONE', stats);
