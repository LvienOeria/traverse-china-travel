import { useState } from 'react';
import type { DayPlan, Waypoint } from '../../lib/types';
import { timeColorStr } from '../../lib/types';
import { usePickStore } from '../../store/pickStore';
import { useTripStore } from '../../store/tripStore';
import { flyToPoint } from '../../lib/leaflet';
import AddWaypointModal from './AddWaypointModal';

function WaypointRow({ day, wp, index, total }: { day: DayPlan; wp: Waypoint; index: number; total: number }) {
  const updateWaypoint = useTripStore((s) => s.updateWaypoint);
  const removeWaypoint = useTripStore((s) => s.removeWaypoint);
  const moveWaypoint = useTripStore((s) => s.moveWaypoint);
  const tColor = timeColorStr(wp.time);

  return (
    <li className={`wp-row ${wp.type === 'drawn' ? 'drawn' : ''}`} style={{ '--wp-color': day.color } as React.CSSProperties}>
      <span className="wp-idx mono">{index + 1}</span>
      <div className="wp-main">
        <div className="wp-name">
          <span className="wp-icon">{wp.type === 'poi' ? '◎' : '＋'}</span>
          <span>{wp.name}</span>
          <button className="wp-fly" title="定位" onClick={() => flyToPoint(wp.lat, wp.lng, 12)}>
            ◎
          </button>
        </div>
        <div className="wp-sub mono">
          {wp.lat.toFixed(4)}, {wp.lng.toFixed(4)}
        </div>
      </div>
      <div className="wp-time-wrap" style={{ '--time-color': tColor } as React.CSSProperties}>
        <input
          type="time"
          className="wp-time mono"
          value={wp.time}
          onChange={(e) => updateWaypoint(day.id, wp.id, { time: e.target.value })}
          title="到达时间"
        />
      </div>
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
  const removeDay = useTripStore((s) => s.removeDay);
  const requestPick = usePickStore((s) => s.requestPick);
  const [showAdd, setShowAdd] = useState(false);
  const [expanded, setExpanded] = useState(true);

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
        <button className="mini-btn" title="展开/收起" onClick={() => setExpanded((v) => !v)}>
          {expanded ? '▾' : '▸'}
        </button>
        <button className="mini-btn danger" title="删除这一天" onClick={() => removeDay(day.id)}>×</button>
      </div>

      {expanded && (
        <div className="day-body">
          <div className="day-summary mono">{day.waypoints.length} 个途经点</div>
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
          <div className="day-hint">途经点会以当天聚类颜色的编号图钉显示在地图上</div>
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
        <p>按天聚类途经点 · 景点直选 · 时间着色</p>
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
