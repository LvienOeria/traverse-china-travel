/**
 * Fetch China POI data from Overpass (OpenStreetMap):
 *  - scenic spots   (tourism=attraction, with Chinese name + image)
 *  - airports       (aeroway=aerodrome)
 *  - railway stations (railway=station, Chinese name, train=yes or image)
 * Writes compact JSON to public/data/*.json
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'public', 'data');
mkdirSync(OUT, { recursive: true });

const BBOX = '18.0,73.5,53.6,135.1'; // south, west, north, east
const MIRRORS = [
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

async function queryOverpass(q) {
  const body = `data=${encodeURIComponent(q)}`;
  for (const mirror of MIRRORS) {
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        const res = await fetch(mirror, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json, text/plain;q=0.9, */*;q=0.5',
            'User-Agent': 'traverse-china-travel-planner/1.0 (data build script)',
          },
          body,
          signal: AbortSignal.timeout(300000),
        });
        if (res.status === 429 || res.status === 504 || res.status === 500) {
          throw new Error(`HTTP ${res.status} (attempt ${attempt})`);
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (json.remark && json.remark.includes('error')) throw new Error(json.remark);
        return json.elements || [];
      } catch (e) {
        const wait = 8000 * attempt;
        console.warn(`  ${mirror} attempt ${attempt} failed: ${e.message} — retrying in ${wait / 1000}s`);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
  }
  throw new Error('All Overpass mirrors failed');
}

const REGIONS = (() => {
  const out = [];
  for (let lat = 18; lat < 54; lat += 5) {
    for (let lon = 73; lon < 136; lon += 9) {
      out.push([lat, lon, Math.min(lat + 5, 53.6), Math.min(lon + 9, 135.1)]);
    }
  }
  return out;
})();

function splitQuery(inner, bbox) {
  return `[out:json][timeout:180];(${inner})(${bbox.join(',')});out tags center;`;
}

function imageUrl(tags) {
  let file = tags.image || tags.wikimedia_commons || tags.photo || '';
  if (!file || !/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file)) return null;
  if (file.startsWith('http')) return file.replace(/^\s*/, '');
  file = file.replace(/^File:/i, '').trim();
  if (!file) return null;
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file).replace(/%2F/g, '/')}?width=400`;
}

function nameZh(tags) {
  return (tags['name:zh'] || tags['name:zh-CN'] || tags['name:zh-Hans'] || tags['name:zh-Hant'] || '').trim();
}
function nameAny(tags) {
  return nameZh(tags) || (tags.name || '').trim() || tags.ref || '未知';
}

const fmt = (n) => Math.round(n * 1e6) / 1e6;

console.log('Fetching scenic spots (24 regions)...');
const spotList = [];
const spotSeen = new Set();
for (let i = 0; i < REGIONS.length; i++) {
  const q = splitQuery(
    'node["tourism"="attraction"]["name:zh"]["image"];node["tourism"="attraction"]["name:zh"]["wikimedia_commons"]',
    REGIONS[i],
  );
  const spots = await queryOverpass(q);
  for (const e of spots) {
    const t = e.tags || {};
    const zh = nameZh(t);
    if (!zh) continue;
    const key = zh;
    if (spotSeen.has(key)) continue;
    spotSeen.add(key);
    const img = imageUrl(t);
    if (!img) continue;
    spotList.push({
      id: `S${e.id}`,
      name: zh,
      en: t['name:en'] || '',
      lat: e.lat ?? e.center?.lat,
      lng: e.lon ?? e.center?.lon,
      img,
      kind: 'scenic',
    });
  }
  console.log(`  region ${i + 1}/${REGIONS.length} → ${spotList.length}`);
}
console.log(`scenic: ${spotList.length}`);

console.log('Fetching airports (24 regions)...');
const aptList = [];
const aptSeen = new Set();
for (let i = 0; i < REGIONS.length; i++) {
  const q = splitQuery(
    'node["aeroway"="aerodrome"]["name:zh"];way["aeroway"="aerodrome"]["name:zh"]',
    REGIONS[i],
  );
  const apts = await queryOverpass(q);
  for (const e of apts) {
    const t = e.tags || {};
    const zh = nameZh(t);
    if (!zh) continue;
    const icao = t.icao || t.iata || '';
    const key = zh + icao;
    if (aptSeen.has(key)) continue;
    aptSeen.add(key);
    aptList.push({
      id: `A${e.id}`,
      name: zh,
      en: t['name:en'] || '',
      lat: e.lat ?? e.center?.lat,
      lng: e.lon ?? e.center?.lon,
      img: imageUrl(t) || '',
      code: (t.iata || t.icao || '').toUpperCase(),
      kind: 'airport',
    });
  }
}
console.log(`airports: ${aptList.length}`);

console.log('Fetching railway stations (24 regions)...');
const staList = [];
const staSeen = new Set();
for (let i = 0; i < REGIONS.length; i++) {
  const q = splitQuery(
    'node["railway"="station"]["name:zh"]["image"];node["railway"="station"]["name:zh"]["train"];node["railway"="station"]["name:zh"]["public_transport"="station"]',
    REGIONS[i],
  );
  const stas = await queryOverpass(q);
  for (const e of stas) {
    const t = e.tags || {};
    const zh = nameZh(t);
    if (!zh) continue;
    const key = zh;
    if (staSeen.has(key)) continue;
    staSeen.add(key);
    const isHSR = t['train'] === 'yes' || /高|动车|城际/.test(zh);
    staList.push({
      id: `T${e.id}`,
      name: zh,
      en: t['name:en'] || '',
      lat: e.lat ?? e.center?.lat,
      lng: e.lon ?? e.center?.lon,
      img: imageUrl(t) || '',
      kind: 'station',
      hsr: isHSR,
    });
  }
}
console.log(`stations: ${staList.length}`);

const stats = { spots: spotList.length, airports: aptList.length, stations: staList.length };
for (const [file, data] of [
  ['spots.json', spotList],
  ['airports.json', aptList],
  ['stations.json', staList],
]) {
  writeFileSync(join(OUT, file), JSON.stringify(data));
}
writeFileSync(join(OUT, 'stats.json'), JSON.stringify(stats));
console.log('DONE', stats);
