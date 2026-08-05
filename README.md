# 途迹 TRAVERSE · 中国可视化旅行规划

基于 Cesium 3D 引擎的可视化旅行规划网页。卫星影像 + 真实地形海拔 + 中国全域景点/机场/高铁站图钉，支持按天聚类规划行程、真实导航路线（Top 3 备选）、手绘路线并泛化贴合地形、路线颜色随时间渐变。

## 功能

- **地图引擎** — Cesium 3D，卫星/街道/暗色三种底图；ArcGIS 世界地形（海拔纵轴）；滚轮缩放、拖拽平移、旋转；俯角滑块（5°–90°）查看地形起伏
- **POI 图钉** — 2100 个景点、278 个机场、5300+ 火车站（OSM 数据，含维基图片）；景点/交通枢纽两种差异化 tooltip（图片、名称、坐标、机场三字码、高铁徽标）；搜索添加 + 逐项显隐 + 一键全部隐藏/显示 + 自动聚合
- **行程规划** — 按天聚类（每天独立颜色）；途径点支持三种来源：POI 搜索 / 在线地名搜索（Nominatim）/ 地图直接选点（反向地理编码）；每天内途径点可排序、设时间、重复使用（如晚归酒店）；一天支持正向/反向旅行方向
- **真实路线** — 相邻途径点自动请求 OSRM 真实道路路线，提供最多 3 条备选；路线重采样后采样地形海拔，贴合起伏；手绘路线（~200m 间距泛化）同样贴合地形
- **时间着色** — 路线颜色随一天中的时间（晨光→正午→暮色→深夜）渐变为每段独立颜色（每条线数百级颜色渐变）
- **海拔剖面** — 底部实时显示所选路线的海拔剖面（距离—海拔曲线）
- **数据持久化** — 行程与收藏列表存入 localStorage，支持 JSON 导入/导出

## 技术栈

- Vite 8 + React 19 + TypeScript
- Cesium 1.144（3D 地形、实体、聚合、拾取）
- Zustand（状态管理 + persist）
- OSM / Overpass（POI 数据）、Wikimedia（图片）、Nominatim（地理编码）、OSRM（导航路线）

## 开发

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # 生产构建
```

## 数据构建（可选）

```bash
# 1. 下载中国 OSM 提取并抽取三类 POI（需 osmium-tool）
#    scripts/fetch-data.mjs 使用 Overpass（备选）；生产建议本地 PBF：
#    osmium tags-filter china-latest.osm.pbf nw/tourism=attraction -o /tmp/attractions.osm.pbf
#    osmium tags-filter china-latest.osm.pbf nw/aeroway=aerodrome -o /tmp/airports.osm.pbf
#    osmium tags-filter china-latest.osm.pbf n/railway=station -o /tmp/stations.osm.pbf
#    osmium export ... --output-format=geojson → /tmp/*.geojson
# 2. 生成 public/data/*.json
node scripts/build-data.mjs
# 3. 用维基缩略图补全景点/机场图片
node scripts/enrich-images.mjs
```

## 数据来源

- POI：© OpenStreetMap 贡献者（ODbL）
- 图片：Wikimedia Commons / 中文维基百科缩略图
- 底图：Bing Aerial / OpenStreetMap / CARTO
- 地形：ArcGIS WorldElevation3D（可选 Cesium Ion Token 升级）
- 路线：OSRM 公共服务器（可替换为自建实例）
