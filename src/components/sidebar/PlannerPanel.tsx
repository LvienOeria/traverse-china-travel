import { useEffect, useState } from 'react';
import type { DayPlan, SegmentPlan, Waypoint } from '../../lib/types';
import { fmtMin, mixHex, timeColorStr } from '../../lib/types';
import { usePickStore } from '../../store/pickStore';
import { useTripStore } from '../../store/tripStore';
import { flyToPoint } from '../../lib/cesium';
import AddWaypointModal from './AddWaypointModal';

function SegmentCard({
  day,
  seg,
  index,
}: {
  day: DayPlan;
  seg: SegmentPlan;
  index: number;
}) {
  const chooseRoute = useTripStore((s) => s.chooseRoute);
  const requestPick = usePickStore((s) => s.requestPick);
  const cancelPick = usePickStore((s) => s.cancelPick);
  const mode = usePickStore((s) => s.mode);

  const wpA = day.waypoints.find((w) => w.id === seg.fromId);
  const wpB = day.waypoints.find((w) => w.id === seg.toId);
  const drawing = mode?.kind === 'segment-draw' && mode.dayId === day.id && mode.segIdx === index;

  const chosen = seg.chosen === null ? null : seg.routes[seg.chosen];
  if (!wpA || !wpB) return null;

  const startDraw = () => {
    flyToPoint((wpA.lat + wpB.lat) / 2, (wpA.lng + wpB.lng) / 2, 60000, 0.5);
    requestPick({ kind: 'segment-draw', dayId: day.id, segIdx: index });
  };

  const c0 = mixHex(day.color, timeColorStr(wpA.time), 0.35);
  const c1 = mixHex(day.color, timeColorStr(wpB.time), 0.35);

  return (
    <div className={`seg-card ${drawing ? 'drawing' : ''}`}>
      <div className="seg-head">
        <span className="seg-index mono">{index + 1}</span>
        <div className="seg-times">
          <span className="seg-time mono" style={{ color: c0 }}>{wpA.time}</span>
          <span className="seg-arrow">→</span>
          <span className="seg-time mono" style={{ color: c1 }}>{wpB.time}</span>
        </div>
        <span className="seg-meta mono">
          {chosen ? `${chosen.distanceKm.toFixed(1)}km · ${fmtMin(chosen.durationMin)}` : '未选择'}
        </span>
        <button
          className={`mini-btn ${drawing ? 'active' : ''}`}
          title="手绘该段路线"
          onClick={() => (drawing ? cancelPick() : startDraw())}
        >
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19l7-7 3 3-7 7-3-3z" />
            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
          </svg>
          {drawing ? '绘制中…' : '手绘'}
        </button>
      </div>
      <div className="seg-options">
        {seg.routes.length === 0 && (
          <div className="seg-empty">路线计算中…</div>
        )}
        {seg.routes.map((r, ri) => {
          const active = seg.chosen === ri;
          const isDrawn = r.source === 'drawn';
          return (
            <button
              key={ri}
              className={`route-opt ${active ? 'active' : ''}`}
              style={{ '--route-color': active ? day.color : 'transparent' } as React.CSSProperties}
              onClick={() => chooseRoute(day.id, index, ri)}
              title={isDrawn ? '手绘路线（已泛化到地形）' : `备选路线 ${ri + 1}`}
            >
              <span className="route-opt-badge mono">
                {isDrawn ? '✎' : ri + 1}
              </span>
              <span className="route-opt-text">
                <span className="route-opt-km mono">
                  {isDrawn ? '自定义' : r.distanceKm.toFixed(1) + ' km'}
                </span>
                <span className="route-opt-min mono">{isDrawn ? '手绘' : fmtMin(r.durationMin)}</span>
              </span>
              <span className="route-opt-check">{active ? '●' : '○'}</span>
            </button>
          );
        })}
        {drawing && (
          <div className="seg-drawing-hint">在地图上单击绘制途经点，双击或按 Enter 结束，Esc 取消</div>
        )}
      </div>
    </div>
  );
}

function WaypointRow({
  day,
  wp,
  index,
  total,
}: {
  day: DayPlan;
  wp: Waypoint;
  index: number;
  total: number;
}) {
  const updateWaypoint = useTripStore((s) => s.updateWaypoint);
  const removeWaypoint = useTripStore((s) => s.removeWaypoint);
  const moveWaypoint = useTripStore((s) => s.moveWaypoint);

  const kindIcon = wp.type === 'poi' ? '◎' : wp.type === 'drawn' ? '✎' : '＋';

  return (
    <li className={`wp-row ${wp.type === 'drawn' ? 'drawn' : ''}`} style={{ '--wp-color': day.color } as React.CSSProperties}>
      <span className="wp-idx mono">{index + 1}</span>
      <div className="wp-main">
        <div className="wp-name">
          <span className="wp-icon">{kindIcon}</span>
          <span>{wp.name}</span>
          <button className="wp-fly" title="定位" onClick={() => flyToPoint(wp.lat, wp.lng)}>
            ◎
          </button>
        </div>
        <div className="wp-sub mono">
          {wp.lat.toFixed(4)}, {wp.lng.toFixed(4)}
        </div>
      </div>
      <input
        type="time"
        className="wp-time mono"
        value={wp.time}
        onChange={(e) => updateWaypoint(day.id, wp.id, { time: e.target.value })}
        title="到达时间"
      />
      <div className="wp-ops">
        <button className="mini-btn" disabled={index === 0} title="上移" onClick={() => moveWaypoint(day.id, index, index - 1)}>↑</button>
        <button className="mini-btn" disabled={index === total - 1} title="下移" onClick={() => moveWaypoint(day.id, index, index + 1)}>↓</button>
        <button className="mini-btn danger" title="移除" onClick={() => removeWaypoint(day.id, wp.id)}>×</button>
      </div>
    </li>
  );
}

function DayCard({ day }: { day: DayPlan }) {
  const setDayColor = useTripStore((s) => s.setDayColor);
  const setDayLabel = useTripStore((s) => s.setDayLabel);
  const setDayDirection = useTripStore((s) => s.setDayDirection);
  const removeDay = useTripStore((s) => s.removeDay);
  const ensureSegments = useTripStore((s) => s.ensureSegments);
  const requestPick = usePickStore((s) => s.requestPick);
  const [showAdd, setShowAdd] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const wpKey = day.waypoints.map((w) => `${w.id}:${w.lat.toFixed(4)},${w.lng.toFixed(4)}:${w.time}`).join('|');
  useEffect(() => {
    if (day.waypoints.length >= 2) void ensureSegments(day.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wpKey]);

  const totalKm = day.segments.reduce((a, s) => a + (s.chosen === null ? 0 : (s.routes[s.chosen]?.distanceKm ?? 0)), 0);
  const totalMin = day.segments.reduce((a, s) => a + (s.chosen === null ? 0 : (s.routes[s.chosen]?.durationMin ?? 0)), 0);

  return (
    <div className="day-card" style={{ '--day-color': day.color } as React.CSSProperties}>
      <div className="day-head">
        <input
          type="color"
          className="day-color"
          value={day.color}
          onChange={(e) => setDayColor(day.id, e.target.value)}
          title="聚类颜色"
        />
        <div className="day-title">
          <input className="day-label" value={day.label} onChange={(e) => setDayLabel(day.id, e.target.value)} />
          <span className="day-date mono">{day.date}</span>
        </div>
        <div className="day-direction" title="旅行方向（正向/反向）">
          <button
            className={`dir-btn ${day.direction === 'forward' ? 'active' : ''}`}
            onClick={() => setDayDirection(day.id, day.direction === 'forward' ? 'reverse' : 'forward')}
          >
            {day.direction === 'forward' ? '正向 →' : '反向 ←'}
          </button>
        </div>
        <button className="mini-btn" title="展开/收起" onClick={() => setExpanded((v) => !v)}>
          {expanded ? '▾' : '▸'}
        </button>
        <button className="mini-btn danger" title="删除这一天" onClick={() => removeDay(day.id)}>×</button>
      </div>

      {expanded && (
        <div className="day-body">
          <div className="day-summary mono">
            {day.waypoints.length} 个途经点 · 全程 {totalKm.toFixed(1)} km · {fmtMin(totalMin)}
          </div>
          <ol className="wp-list">
            {day.waypoints.map((wp, i) => (
              <WaypointRow key={wp.id} day={day} wp={wp} index={i} total={day.waypoints.length} />
            ))}
          </ol>
          <div className="day-add-row">
            <button className="text-btn" onClick={() => setShowAdd(true)}>＋ 添加途经点</button>
            <button className="text-btn" onClick={() => requestPick({ kind: 'waypoint', dayId: day.id })}>
              ◎ 地图选点
            </button>
          </div>
          <div className="day-segs">
            {day.segments.map((seg, i) => (
              <SegmentCard key={`${seg.fromId}-${seg.toId}-${i}`} day={day} seg={seg} index={i} />
            ))}
            {day.waypoints.length < 2 && (
              <div className="day-hint">再添加至少 1 个途经点，即可计算真实路线（每段 Top 3 备选）</div>
            )}
          </div>
        </div>
      )}
      {showAdd && <AddWaypointModal dayId={day.id} onClose={() => setShowAdd(false)} />}
    </div>
  );
}

export default function PlannerPanel() {
  const trip = useTripStore((s) => s.trip);
  const newTrip = useTripStore((s) => s.newTrip);
  const deleteTrip = useTripStore((s) => s.deleteTrip);
  const renameTrip = useTripStore((s) => s.renameTrip);
  const addDay = useTripStore((s) => s.addDay);
  const exportTrip = useTripStore((s) => s.exportTrip);
  const importTrip = useTripStore((s) => s.importTrip);
  const [importErr, setImportErr] = useState('');

  const handleExport = () => {
    const blob = new Blob([exportTrip()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${trip?.name ?? 'trip'}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setImportErr(importTrip(String(reader.result)) ? '' : '导入失败：文件格式不正确');
    };
    reader.readAsText(file);
  };

  if (!trip) {
    return (
      <div className="planner-empty">
        <div className="planner-empty-mark">
          <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M3 17l6-8 4 5 4-6 4 9" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3 21h18" strokeLinecap="round" />
            <circle cx="7" cy="8" r="2.2" />
            <circle cx="17" cy="6" r="1.8" />
          </svg>
        </div>
        <h2>规划你的中国之行</h2>
        <p>按天聚类行程 · 真实导航路线 · 随时间着色的轨迹</p>
        <button className="primary-btn" onClick={() => newTrip()}>＋ 新建旅程</button>
        <label className="text-btn import-btn">
          导入 JSON
          <input type="file" accept="application/json" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])} />
        </label>
        {importErr && <p className="err-text">{importErr}</p>}
      </div>
    );
  }

  return (
    <div className="planner-panel">
      <div className="trip-head">
        <input className="trip-name" value={trip.name} onChange={(e) => renameTrip(e.target.value)} />
        <div className="trip-ops">
          <button className="mini-btn" title="导出行程 JSON" onClick={handleExport}>↓</button>
          <label className="mini-btn" title="导入行程 JSON">
            ↑
            <input type="file" accept="application/json" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])} />
          </label>
          <button className="mini-btn danger" title="删除整个行程" onClick={() => { if (confirm('删除整个行程？此操作不可恢复。')) deleteTrip(); }}>×</button>
        </div>
      </div>
      {importErr && <p className="err-text">{importErr}</p>}
      <div className="days-list">
        {trip.days.map((d) => (
          <DayCard key={d.id} day={d} />
        ))}
      </div>
      <button className="add-day-btn" onClick={addDay}>
        ＋ 增加一天
      </button>
    </div>
  );
}
