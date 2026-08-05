/**
 * Build final POI datasets from osmium extracts.
 * Inputs: /tmp/attractions.geojson, /tmp/airports.geojson, /tmp/stations.opl
 * Output: public/data/{spots,airports,stations}.json
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const OUT = new URL('../public/data/', import.meta.url).pathname;

function decodeOplValue(v) {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

function parseOpl(line) {
  const parts = line.split('\t');
  const tags = {};
  for (const p of parts) {
    if (p.length >= 3 && p[1] === '=') {
      tags[decodeOplValue(p.slice(0, p.indexOf('=')))] = decodeOplValue(p.slice(p.indexOf('=') + 1));
    }
  }
  return tags;
}

function imageUrl(tags) {
  let file = tags.image || tags.wikimedia_commons || tags.photo || '';
  if (!file || !/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file)) return null;
  if (file.startsWith('http')) return file.trim();
  file = file.replace(/^File:/i, '').trim();
  if (!file) return null;
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file).replace(/%2F/g, '/')}?width=400`;
}

function nameZh(tags) {
  return (tags['name:zh'] || tags['name:zh-CN'] || tags['name:zh-Hans'] || '').trim();
}
function nameAny(tags) {
  return nameZh(tags) || (tags.name || '').trim();
}

function geojsonCenter(geom) {
  if (geom.type === 'Point') return [geom.coordinates[0], geom.coordinates[1]];
  const coords = geom.type === 'Polygon' ? geom.coordinates[0] : geom.coordinates.flat(2);
  const lngs = coords.map((c) => c[0]);
  const lats = coords.map((c) => c[1]);
  const cLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
  const cLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  if (!isFinite(cLng) || !isFinite(cLat)) return null;
  return [cLng, cLat];
}

// ---------- attractions ----------
const spotList = [];
const spotSeen = new Set();
{
  const gj = JSON.parse(readFileSync('/tmp/attractions.geojson', 'utf8'));
  for (const f of gj.features) {
    const t = f.properties || {};
    const zh = nameZh(t);
    if (!zh) continue;
    if (spotSeen.has(zh)) continue;
    const center = geojsonCenter(f.geometry);
    if (!center) continue;
    const img = imageUrl(t);
    spotList.push({
      id: `S${f.id || 'a' + spotList.length}`,
      name: zh,
      en: t['name:en'] || '',
      lat: Math.round(center[1] * 1e6) / 1e6,
      lng: Math.round(center[0] * 1e6) / 1e6,
      img: img || '',
      kind: 'scenic',
    });
    spotSeen.add(zh);
  }
}
console.log('spots raw:', spotList.length);

// ---------- airports ----------
const aptList = [];
const aptSeen = new Set();
{
  const gj = JSON.parse(readFileSync('/tmp/airports.geojson', 'utf8'));
  for (const f of gj.features) {
    const t = f.properties || {};
    const zh = nameZh(t);
    if (!zh) continue;
    const code = (t.iata || t.icao || '').toUpperCase();
    const key = zh + code;
    if (aptSeen.has(key)) continue;
    const center = geojsonCenter(f.geometry);
    if (!center) continue;
    aptList.push({
      id: `A${f.id || 'a' + aptList.length}`,
      name: zh,
      en: t['name:en'] || '',
      lat: Math.round(center[1] * 1e6) / 1e6,
      lng: Math.round(center[0] * 1e6) / 1e6,
      img: imageUrl(t) || '',
      code,
      kind: 'airport',
    });
    aptSeen.add(key);
  }
}
console.log('airports raw:', aptList.length);

// ---------- stations ----------
const staList = [];
const staSeen = new Set();
{
  const gj = JSON.parse(readFileSync('/tmp/stations.geojson', 'utf8'));
  for (const f of gj.features) {
    const t = f.properties || {};
    const zh = nameZh(t);
    if (!zh) continue;
    if (t.railway !== 'station') continue;
    if (staSeen.has(zh)) continue;
    const center = geojsonCenter(f.geometry);
    if (!center) continue;
    const isHSR = t.train === 'yes' || /高|动车|城际/.test(zh);
    if (!imageUrl(t) && !isHSR && t['public_transport'] !== 'station') continue;
    staSeen.add(zh);
    staList.push({
      id: `T${f.id || 'a' + staList.length}`,
      name: zh,
      en: t['name:en'] || '',
      lat: Math.round(center[1] * 1e6) / 1e6,
      lng: Math.round(center[0] * 1e6) / 1e6,
      img: imageUrl(t) || '',
      kind: 'station',
      hsr: isHSR,
    });
  }
}
console.log('stations raw:', staList.length);

// ---------- curated top spots (guaranteed quality) ----------
const CURATED = [
  ['故宫', 116.397, 39.916, '故宫博物院'],
  ['天坛公园', 116.406, 39.882, '天坛'],
  ['颐和园', 116.275, 39.999, '颐和园'],
  ['八达岭长城', 116.018, 40.354, '八达岭长城'],
  ['慕田峪长城', 116.561, 40.431, '慕田峪长城'],
  ['外滩', 121.49, 31.24, '外滩'],
  ['豫园', 121.492, 31.227, '豫园'],
  ['东方明珠', 121.499, 31.239, '东方明珠'],
  ['兵马俑', 109.277, 34.384, '秦始皇兵马俑博物馆'],
  ['大雁塔', 108.964, 34.218, '大慈恩寺大雁塔'],
  ['西安城墙', 108.941, 34.253, '西安城墙'],
  ['成都大熊猫基地', 104.146, 30.736, '成都大熊猫繁育研究基地'],
  ['宽窄巷子', 104.055, 30.669, '宽窄巷子'],
  ['都江堰', 103.619, 31.007, '都江堰景区'],
  ['洪崖洞', 106.577, 29.562, '洪崖洞民俗风貌区'],
  ['磁器口古镇', 106.459, 29.574, '磁器口古镇'],
  ['西湖', 120.15, 30.24, '西湖风景名胜区'],
  ['灵隐寺', 120.102, 30.242, '灵隐寺'],
  ['千岛湖', 119.02, 29.60, '千岛湖风景区'],
  ['拙政园', 120.633, 31.324, '拙政园'],
  ['虎丘', 120.58, 31.338, '虎丘山风景名胜区'],
  ['周庄古镇', 120.852, 31.115, '周庄古镇'],
  ['漓江', 110.29, 25.28, '漓江风景名胜区'],
  ['阳朔西街', 110.496, 24.779, '阳朔西街'],
  ['象鼻山', 110.297, 25.266, '象鼻山景区'],
  ['张家界国家森林公园', 110.43, 29.32, '张家界国家森林公园'],
  ['天门山', 110.677, 29.053, '天门山国家森林公园'],
  ['黄山', 118.16, 30.13, '黄山风景区'],
  ['鼓浪屿', 118.064, 24.447, '鼓浪屿'],
  ['厦门大学', 118.104, 24.436, '厦门大学'],
  ['崂山', 120.61, 36.18, '崂山风景区'],
  ['青岛栈桥', 120.327, 36.062, '青岛栈桥'],
  ['亚龙湾', 109.63, 18.20, '亚龙湾'],
  ['天涯海角', 109.33, 18.29, '天涯海角游览区'],
  ['丽江古城', 100.233, 26.873, '丽江古城'],
  ['玉龙雪山', 100.17, 27.10, '玉龙雪山景区'],
  ['泸沽湖', 100.77, 27.70, '泸沽湖'],
  ['大理古城', 100.162, 25.698, '大理古城'],
  ['洱海', 100.17, 25.65, '洱海'],
  ['布达拉宫', 91.117, 29.657, '布达拉宫'],
  ['大昭寺', 91.131, 29.653, '大昭寺'],
  ['纳木错', 90.69, 30.70, '纳木错湖'],
  ['九寨沟', 103.92, 33.26, '九寨沟国家级自然保护区'],
  ['黄龙', 103.84, 32.74, '黄龙风景名胜区'],
  ['莫高窟', 94.81, 40.04, '敦煌莫高窟'],
  ['鸣沙山月牙泉', 94.67, 40.09, '鸣沙山月牙泉'],
  ['天山天池', 88.12, 43.88, '天山天池'],
  ['圣索菲亚教堂', 126.621, 45.773, '圣索菲亚大教堂'],
  ['太平山顶', 114.143, 22.283, '太平山顶'],
  ['维多利亚港', 114.172, 22.297, '维多利亚港'],
  ['大三巴牌坊', 113.541, 22.197, '大三巴牌坊'],
  ['台北101', 121.565, 25.033, '台北101'],
  ['日月潭', 120.92, 23.86, '日月潭'],
  ['阿里山', 120.80, 23.52, '阿里山国家风景区'],
  ['泰山', 117.10, 36.25, '泰山风景区'],
  ['华山', 110.08, 34.48, '华山风景区'],
  ['少林寺', 112.94, 34.50, '嵩山少林寺'],
  ['峨眉山', 103.33, 29.52, '峨眉山风景区'],
  ['五台山', 113.55, 39.00, '五台山'],
  ['庐山', 115.98, 29.55, '庐山风景区'],
  ['三清山', 118.05, 28.91, '三清山风景区'],
  ['武夷山', 117.97, 27.65, '武夷山风景区'],
  ['长白山天池', 128.05, 42.03, '长白山天池'],
  ['喀纳斯湖', 87.0, 48.7, '喀纳斯湖'],
  ['青海湖', 100.14, 36.88, '青海湖'],
  ['茶卡盐湖', 99.09, 36.70, '茶卡盐湖'],
  ['张掖七彩丹霞', 100.18, 38.96, '张掖七彩丹霞'],
  ['嘉峪关', 98.21, 39.80, '嘉峪关关城'],
  ['黄果树瀑布', 105.67, 25.98, '黄果树瀑布'],
  ['西双版纳热带植物园', 100.80, 21.90, '西双版纳热带植物园'],
  ['布达拉宫广场', 91.117, 29.654, '布达拉宫广场'],
  ['天安门广场', 116.391, 39.905, '天安门广场'],
  ['什刹海', 116.39, 39.94, '什刹海'],
  ['南锣鼓巷', 116.403, 39.938, '南锣鼓巷'],
  ['国家体育场(鸟巢)', 116.398, 39.992, '鸟巢'],
  ['珠江夜游', 113.32, 23.11, '珠江'],
  ['广州塔', 113.324, 23.106, '广州塔'],
  ['长隆欢乐世界', 113.32, 23.01, '长隆欢乐世界'],
  ['深圳湾公园', 113.94, 22.53, '深圳湾公园'],
  ['世界之窗', 113.97, 22.54, '世界之窗'],
  ['橘子洲头', 112.96, 28.19, '橘子洲'],
  ['岳麓书院', 112.94, 28.19, '岳麓书院'],
  ['滕王阁', 115.88, 28.68, '滕王阁'],
  ['婺源篁岭', 117.85, 29.25, '婺源篁岭'],
  ['三坊七巷', 119.30, 26.08, '三坊七巷'],
  ['土楼(永定)', 116.90, 24.60, '福建土楼'],
  ['黄山宏村', 117.99, 30.00, '宏村'],
  ['普陀山', 122.39, 30.00, '普陀山'],
  ['雁荡山', 121.05, 28.37, '雁荡山'],
  ['瘦西湖', 119.43, 32.41, '瘦西湖'],
  ['中山陵', 118.85, 32.06, '中山陵'],
  ['夫子庙', 118.79, 32.02, '夫子庙秦淮风光带'],
  ['鸡鸣寺', 118.80, 32.06, '鸡鸣寺'],
  ['太湖鼋头渚', 120.23, 31.52, '鼋头渚'],
  ['寒山寺', 120.56, 31.31, '寒山寺'],
  ['乌镇', 120.49, 30.74, '乌镇'],
  ['南浔古镇', 120.43, 30.87, '南浔古镇'],
  ['普达措国家公园', 99.93, 27.90, '普达措国家公园'],
  ['虎跳峡', 100.08, 27.18, '虎跳峡'],
  ['泸定桥', 102.24, 29.91, '泸定桥'],
  ['峨眉山金顶', 103.34, 29.52, '峨眉山金顶'],
  ['乐山大佛', 103.77, 29.55, '乐山大佛'],
  ['九寨沟黄龙机场', 103.91, 32.90, '九黄机场'],
  ['若尔盖草原', 102.95, 33.57, '若尔盖草原'],
  ['宽窄巷子', 104.055, 30.669, '宽窄巷子'],
];
const CURATED_IMG = 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/China_map.svg/400px-China_map.svg.png';
for (const [name, lng, lat, en] of CURATED) {
  if (spotSeen.has(name)) continue;
  spotSeen.add(name);
  spotList.push({
    id: `S-curated-${spotList.length}`,
    name,
    en,
    lat,
    lng,
    img: CURATED_IMG,
    kind: 'scenic',
  });
}
console.log('spots final:', spotList.length);

// ---------- prune spots without images (keep quality for tooltips) ----------
// keep all, but sort: with image first
spotList.sort((a, b) => (b.img ? 1 : 0) - (a.img ? 1 : 0));
const stats = {
  spots: spotList.length,
  airports: aptList.length,
  stations: staList.length,
  spotsWithImg: spotList.filter((s) => s.img).length,
  stationsWithImg: staList.filter((s) => s.img).length,
  airportsWithImg: aptList.filter((s) => s.img).length,
};

writeFileSync(OUT + 'spots.json', JSON.stringify(spotList));
writeFileSync(OUT + 'airports.json', JSON.stringify(aptList));
writeFileSync(OUT + 'stations.json', JSON.stringify(staList));
writeFileSync(OUT + 'stats.json', JSON.stringify(stats));
console.log(stats);
