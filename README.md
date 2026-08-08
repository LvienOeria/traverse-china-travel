# 途迹 TRAVERSE · 中国可视化旅行规划

轻量 2D 中国地图旅行规划工具。基于 Leaflet 的平面地图 + 2100 个中国景点的图钉系统，按天聚类规划行程，交互流畅、开箱即用。

## 功能

- **2D 平面中国地图** — 只渲染中国范围，平移/缩放/飞行过渡动画流畅；标准图/卫星图/OSM 三种底图；方向键平移
- **景点图钉** — 2100 个景点（OSM 数据 + 维基百科图片），自动聚合；悬停显示图片/坐标/英文名的精美 tooltip；搜索添加收藏、逐项显隐、一键全部隐藏/显示
- **定位标记** — 点击「定位」飞行至景点并显示醒目琥珀色图钉 + 名称标签；点击地图任意位置或再次点击按钮取消
- **行程规划** — 按天聚类（每天独立颜色）；途经点三种来源：景点搜索 / 在线地名搜索（Nominatim）/ 地图直接选点（反向地理编码）；途经点可排序、设置时间（时间色点显示晨→午→暮）、同一天可重复使用
- **数据持久化** — 行程与收藏列表存入 localStorage，支持 JSON 导入/导出

> 注：3D 地形、机场/车站图钉、真实导航路线等功能已按性能优先原则暂缓，数据管线保留在 `scripts/`，后续可重新启用。

## 技术栈

- Vite 8 + React 19 + TypeScript
- Leaflet + markercluster（~400KB 打包体积，gzip 124KB）
- Zustand（状态管理 + persist）
- 数据：OSM / Overpass / Geofabrik（景点 POI）、Wikimedia（图片）、Nominatim（地理编码）、高德/OSM（瓦片底图）

## 开发

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # 生产构建
```

## 数据构建（可选）

```bash
# 依赖 osmium-tool；从中国 OSM 提取生成 public/data/spots.json
node scripts/build-data.mjs
# 用维基缩略图补全景点图片
node scripts/enrich-images.mjs
```

## 数据来源

- 景点：© OpenStreetMap 贡献者（ODbL）
- 图片：Wikimedia Commons / 中文维基百科缩略图
- 底图：高德地图 / OpenStreetMap
