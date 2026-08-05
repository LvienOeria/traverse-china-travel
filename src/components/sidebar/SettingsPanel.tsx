import { useAppStore } from '../../store/appStore';

export default function SettingsPanel() {
  const settings = useAppStore((s) => s.settings);
  const setSettings = useAppStore((s) => s.setSettings);

  return (
    <div className="settings-panel">
      <div className="setting-group">
        <h4>地图底图</h4>
        <div className="seg">
          {(
            [
              ['bing', '卫星影像'],
              ['osm', 'OSM 街道'],
              ['carto', '暗色底图'],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              className={settings.imagery === v ? 'seg-btn active' : 'seg-btn'}
              onClick={() => setSettings({ imagery: v })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="setting-group">
        <h4>地形（纵轴 · 海拔）</h4>
        <div className="seg">
          {(
            [
              ['arcgis', 'ArcGIS 地形'],
              ['ion', 'Cesium Ion'],
              ['flat', '无地形'],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              className={settings.terrain === v ? 'seg-btn active' : 'seg-btn'}
              onClick={() => setSettings({ terrain: v })}
            >
              {label}
            </button>
          ))}
        </div>
        {settings.terrain === 'ion' && (
          <input
            className="token-input mono"
            placeholder="Cesium Ion Token（选填）"
            value={settings.ionToken}
            onChange={(e) => setSettings({ ionToken: e.target.value })}
          />
        )}
        <p className="setting-hint">地形开启后，路线与手绘路径会贴合真实海拔起伏，可拖动俯角滑块观看地形高低。</p>
      </div>

      <div className="setting-group">
        <h4>轨迹显示</h4>
        <label className="check-row">
          <input type="checkbox" checked={settings.showRoutes} onChange={(e) => setSettings({ showRoutes: e.target.checked })} />
          <span>显示规划路线</span>
        </label>
        <label className="check-row">
          <input type="checkbox" checked={settings.showWaypoints} onChange={(e) => setSettings({ showWaypoints: e.target.checked })} />
          <span>显示途经点编号</span>
        </label>
        <div className="check-row">
          <span>路线粗细</span>
          <input
            type="range"
            min={1}
            max={8}
            step={1}
            value={settings.routeThickness}
            onChange={(e) => setSettings({ routeThickness: Number(e.target.value) })}
          />
          <span className="mono">{settings.routeThickness}px</span>
        </div>
      </div>

      <div className="setting-group">
        <h4>交互说明</h4>
        <ul className="help-list">
          <li>左键拖拽平移 · 滚轮缩放 · 右键拖拽旋转</li>
          <li>拖动左侧「俯角」滑块，查看地形立体起伏</li>
          <li>悬停绿色/蓝色/红色图钉查看景点与交通枢纽详情</li>
          <li>行程页：添加途经点 → 自动计算每段 Top 3 真实路线</li>
          <li>路线颜色随一天中时间早晚渐变（晨光→正午→暮色）</li>
          <li>手绘路线会按 ~200m 间距重采样并贴合地形</li>
        </ul>
      </div>
    </div>
  );
}
