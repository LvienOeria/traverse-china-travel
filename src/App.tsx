import { useEffect, useState } from 'react';
import MapViewer from './components/map/MapViewer';
import PoiLayer, { type TooltipTarget } from './components/map/PoiLayer';
import TripLayer from './components/map/TripLayer';
import MapControls from './components/map/MapControls';
import MapTooltip from './components/map/MapTooltip';
import LocateMarker from './components/map/LocateMarker';
import Sidebar from './components/sidebar/Sidebar';
import { useAppStore } from './store/appStore';
import { usePickStore } from './store/pickStore';
import { reverseGeocode } from './lib/network';
import { getMap } from './lib/leaflet';
import { useTripStore } from './store/tripStore';

export default function App() {
  const [tooltip, setTooltip] = useState<TooltipTarget | null>(null);
  const [wpTooltip, setWpTooltip] = useState<{ name: string; time: string; dayColor: string; dayLabel: string; screenX: number; screenY: number } | null>(null);
  const [pickHint, setPickHint] = useState('');
  const pickMode = usePickStore((s) => s.mode);
  const cancelPick = usePickStore((s) => s.cancelPick);
  const locateTarget = useAppStore((s) => s.locateTarget);
  const addWaypoint = useTripStore((s) => s.addWaypoint);

  useEffect(() => {
    setPickHint(pickMode?.kind === 'waypoint' ? '在地图上单击选择途经点位置 · Esc 取消' : '');
  }, [pickMode]);

  // map click → waypoint pick
  useEffect(() => {
    if (pickMode?.kind !== 'waypoint') return;
    const map = getMap();
    if (!map) return;
    const onClick = async (e: { latlng: { lat: number; lng: number } }) => {
      const { lat, lng } = e.latlng;
      const name = await reverseGeocode(lat, lng);
      const d = new Date();
      const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      addWaypoint(pickMode.dayId, { type: 'drawn', name, lat, lng, time });
      cancelPick();
    };
    map.on('click', onClick);
    return () => {
      map.off('click', onClick);
    };
  }, [pickMode, addWaypoint, cancelPick]);

  return (
    <div className="app">
      <Sidebar />
      <main className="map-stage">
        <MapViewer>
          <PoiLayer
            onHover={(t) => {
              setTooltip(t);
              if (t) setWpTooltip(null);
            }}
            onPick={(poi) => {
              const { isListed, addToList } = useAppStore.getState();
              if (!isListed(poi.id)) addToList(poi);
            }}
          />
          <TripLayer
            onHover={(wp, target) => {
              setWpTooltip(wp && target ? { ...wp, ...target } : null);
              if (wp) setTooltip(null);
            }}
          />
          <MapControls />
          <MapTooltip
            target={tooltip}
            added={tooltip ? useAppStore.getState().isListed(tooltip.poi.id) : false}
            onAdd={(poi) => useAppStore.getState().addToList(poi)}
          />
          {wpTooltip && (
            <div
              className="map-tooltip wp-tooltip"
              style={{ left: wpTooltip.screenX + 18, top: wpTooltip.screenY - 90 }}
            >
              <div className="tooltip-body">
                <div className="tooltip-name" style={{ color: wpTooltip.dayColor }}>{wpTooltip.name}</div>
                <div className="tooltip-coord mono">{wpTooltip.dayLabel} · 到达 {wpTooltip.time}</div>
              </div>
            </div>
          )}
          <LocateMarker />
        </MapViewer>
        {pickHint && (
          <div className="pick-banner">
            <span className="pick-dot" />
            {pickHint}
            <button className="pick-cancel" onClick={cancelPick}>取消</button>
          </div>
        )}
        {locateTarget && !pickHint && (
          <div className="pick-banner locate-banner">
            <span className="pick-dot" />
            定位中 — 点击地图任意位置，或再次点击列表中的 ◎ 取消定位
          </div>
        )}
      </main>
    </div>
  );
}
