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
              ['amap', '标准地图'],
              ['satellite', '卫星影像'],
              ['osm', 'OSM 街道'],
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
        <p className="setting-hint">2D 平面中国地图，平移/缩放/飞行过渡动画流畅。</p>
      </div>

      <div className="setting-group">
        <h4>显示</h4>
        <label className="check-row">
          <input type="checkbox" checked={settings.showWaypoints} onChange={(e) => setSettings({ showWaypoints: e.target.checked })} />
          <span>显示途经点编号图钉</span>
        </label>
      </div>

      <div className="setting-group">
        <h4>交互说明</h4>
        <ul className="help-list">
          <li>左键拖拽平移 · 滚轮缩放 · 方向键平移</li>
          <li>双击地图快速放大</li>
          <li>悬停绿色图钉查看景点详情与图片</li>
          <li>行程页：添加途经点 → 以当天聚类颜色显示编号图钉</li>
          <li>途经点时间会以时间色点显示（晨→午→暮）</li>
          <li>「定位」后点击地图任意位置可取消标记</li>
        </ul>
      </div>
    </div>
  );
}
