import { useMemo, useState } from 'react';
import type { Poi } from '../../lib/types';
import { useAppStore } from '../../store/appStore';
import { flyToPoint } from '../../lib/leaflet';
import SearchBox, { type SearchHit } from './SearchBox';

export default function PoiPanel() {
  const list = useAppStore((s) => s.scenicList);
  const showPois = useAppStore((s) => s.showPois);
  const locateTarget = useAppStore((s) => s.locateTarget);
  const [expanded, setExpanded] = useState(true);

  const hiddenCount = list.filter((l) => !l.visible).length;
  const visibleList = useMemo(() => [...list].sort((a, b) => b.addedAt - a.addedAt), [list]);

  const onPick = (hit: SearchHit) => {
    if (hit.kind !== 'scenic' || !hit.poi) return;
    useAppStore.getState().addToList(hit.poi);
    flyToPoint(hit.lat, hit.lng);
  };

  const locatePoi = (poi: Poi) => {
    const app = useAppStore.getState();
    const isActive = app.locateTarget && app.locateTarget.name === poi.name && Math.abs(app.locateTarget.lat - poi.lat) < 1e-6 && Math.abs(app.locateTarget.lng - poi.lng) < 1e-6;
    if (isActive) {
      app.setLocateTarget(null);
    } else {
      app.setLocateTarget({ lat: poi.lat, lng: poi.lng, name: poi.name });
    }
  };

  return (
    <div className="poi-panel">
      <div className="kind-section">
        <div className="kind-head">
          <button className="kind-title" onClick={() => setExpanded((v) => !v)}>
            <span className="kind-chevron">{expanded ? '▾' : '▸'}</span>
            <span className="kind-ico">⛰</span>
            <span>风景名胜</span>
            <span className="kind-count mono">{list.length}</span>
            {hiddenCount > 0 && <span className="kind-hidden mono">{hiddenCount} 隐藏</span>}
          </button>
          <div className="kind-actions">
            <button className="mini-btn" title={showPois ? '隐藏全部景点图钉' : '显示全部景点图钉'} onClick={() => useAppStore.getState().setShowPois(!showPois)}>
              <EyeIcon on={showPois} />
            </button>
            <button className="mini-btn" title="清空列表" disabled={list.length === 0} onClick={() => useAppStore.getState().clearList()}>
              <TrashIcon />
            </button>
          </div>
        </div>
        {expanded && (
          <>
            <div className="kind-search">
              <SearchBox placeholder="搜索景点，如「西湖」「长城」" kinds={['scenic']} onPick={onPick} />
            </div>
            <div className="kind-actions-row">
              <button className="text-btn" onClick={() => useAppStore.getState().toggleListAll()} disabled={list.length === 0}>
                {hiddenCount > 0 ? '全部显示' : '全部隐藏'}
              </button>
              <span className="text-btn-hint mono">{list.length} 项已收藏</span>
            </div>
            <ul className="poi-list">
              {visibleList.map(({ poi, visible }) => (
                <li key={poi.id} className={`poi-item ${visible ? '' : 'off'}`}>
                  <div className="poi-thumb">
                    {poi.img ? (
                      <img src={poi.img} alt="" loading="lazy" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
                    ) : (
                      <span className="poi-thumb-fallback">⛰</span>
                    )}
                  </div>
                  <div className="poi-info">
                    <div className="poi-name">{poi.name}</div>
                    <div className="poi-sub mono">
                      {poi.lat.toFixed(3)}°N · {poi.lng.toFixed(3)}°E
                    </div>
                  </div>
                  <div className="poi-ops">
                    <button
                      className={`mini-btn ${locateTarget && locateTarget.name === poi.name && Math.abs(locateTarget.lat - poi.lat) < 1e-6 && Math.abs(locateTarget.lng - poi.lng) < 1e-6 ? 'active' : ''}`}
                      title={locateTarget && locateTarget.name === poi.name ? '取消定位' : '定位到地图'}
                      onClick={() => locatePoi(poi)}
                    >
                      <LocateIcon />
                    </button>
                    <button className="mini-btn" title={visible ? '隐藏该图钉' : '显示该图钉'} onClick={() => useAppStore.getState().toggleItem(poi.id)}>
                      <EyeIcon on={visible} />
                    </button>
                    <button className="mini-btn danger" title="移出列表" onClick={() => useAppStore.getState().removeFromList(poi.id)}>
                      <TrashIcon />
                    </button>
                  </div>
                </li>
              ))}
              {list.length === 0 && (
                <li className="poi-empty">在上方搜索并添加景点，图钉即会出现在地图上</li>
              )}
            </ul>
          </>
        )}
      </div>
      <div className="panel-note">
        <p>悬停地图上的绿色图钉查看景点详情与图片；「行程」页可将景点直接设为途经点。</p>
      </div>
    </div>
  );
}

export function EyeIcon({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {on ? (
        <>
          <path d="M1 12s4-7.5 11-7.5S23 12 23 12s-4 7.5-11 7.5S1 12 1 12z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : (
        <>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
          <path d="M1 1l22 22" />
        </>
      )}
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

function LocateIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" />
    </svg>
  );
}
