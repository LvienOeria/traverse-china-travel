import { useCallback, useEffect, useState } from 'react';
import * as Cesium from 'cesium';
import MapViewer from './components/map/MapViewer';
import PoiLayer, { type TooltipTarget } from './components/map/PoiLayer';
import TripLayer from './components/map/TripLayer';
import DrawTool from './components/map/DrawTool';
import MapControls from './components/map/MapControls';
import MapTooltip from './components/map/MapTooltip';
import ElevationProfile from './components/map/ElevationProfile';
import Sidebar from './components/sidebar/Sidebar';
import { useAppStore } from './store/appStore';
import { usePickStore } from './store/pickStore';
import { reverseGeocode, routeOptionFromGeometry } from './lib/network';
import { haversineKm } from './lib/types';
import { getViewer } from './lib/cesium';
import { useTripStore } from './store/tripStore';

export default function App() {
  const [tooltip, setTooltip] = useState<TooltipTarget | null>(null);
  const [pickHint, setPickHint] = useState('');
  const pickMode = usePickStore((s) => s.mode);
  const cancelPick = usePickStore((s) => s.cancelPick);
  const addWaypoint = useTripStore((s) => s.addWaypoint);
  const setDrawnRoute = useTripStore((s) => s.setDrawnRoute);
  const trip = useTripStore((s) => s.trip);

  useEffect(() => {
    setPickHint(
      pickMode?.kind === 'waypoint'
        ? '在地图上单击选择途经点位置 · Esc 取消'
        : pickMode?.kind === 'segment-draw'
          ? '单击添加路径点，双击 / Enter 结束 · Esc 取消'
          : '',
    );
  }, [pickMode]);

  // map click → waypoint pick
  useEffect(() => {
    if (pickMode?.kind !== 'waypoint') return;
    const viewer = getViewer();
    if (!viewer) return;
    const scene = viewer.scene;
    const handler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
    handler.setInputAction(async (e: { position: Cesium.Cartesian2 }) => {
      const ray = viewer.camera.getPickRay(e.position);
      if (!ray) return;
      const cart = scene.globe.pick(ray, scene);
      if (!cart) return;
      const carto = Cesium.Cartographic.fromCartesian(cart);
      const lat = Cesium.Math.toDegrees(carto.latitude);
      const lng = Cesium.Math.toDegrees(carto.longitude);
      const name = await reverseGeocode(lat, lng);
      const d = new Date();
      const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      const dayId = pickMode.dayId;
      addWaypoint(dayId, { type: 'drawn', name, lat, lng, time });
      cancelPick();
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    return () => handler.destroy();
  }, [pickMode, addWaypoint, cancelPick]);

  const onDrawDone = useCallback(
    (geometry: { lat: number; lng: number }[]) => {
      const mode = usePickStore.getState().mode;
      if (mode?.kind !== 'segment-draw') return;
      const { trip: t } = useTripStore.getState();
      const day = t?.days.find((d) => d.id === mode.dayId);
      const seg = day?.segments[mode.segIdx];
      if (!day || !seg) {
        cancelPick();
        return;
      }
      const a = day.waypoints.find((w) => w.id === seg.fromId);
      const b = day.waypoints.find((w) => w.id === seg.toId);
      if (!a || !b) {
        cancelPick();
        return;
      }
      let dist = 0;
      for (let i = 1; i < geometry.length; i++) {
        dist += haversineKm(geometry[i - 1], geometry[i]);
      }
      const route = {
        ...routeOptionFromGeometry(a, b, geometry),
        distanceKm: dist,
        durationMin: (dist / 70) * 60,
      };
      setDrawnRoute(mode.dayId, mode.segIdx, route);
      cancelPick();
    },
    [setDrawnRoute, cancelPick],
  );

  return (
    <div className="app">
      <Sidebar />
      <main className="map-stage">
        <MapViewer>
          <PoiLayer
            onHover={(t) => setTooltip(t)}
            onPick={(poi) => {
              const { isListed, addToList } = useAppStore.getState();
              if (!isListed(poi.kind, poi.id)) addToList(poi);
            }}
          />
          <TripLayer />
          <DrawTool
            active={pickMode?.kind === 'segment-draw'}
            onDone={onDrawDone}
            onCancel={cancelPick}
          />
          <MapControls
            drawActive={pickMode?.kind === 'segment-draw'}
            onToggleDraw={() => {
              const { requestPick: rp } = usePickStore.getState();
              const m = usePickStore.getState().mode;
              if (!m || m.kind !== 'segment-draw') {
                const day = trip?.days.find((d) => d.segments.some((s) => s.chosen !== null || s.routes.length > 0));
                if (day) rp({ kind: 'segment-draw', dayId: day.id, segIdx: 0 });
                else rp({ kind: 'segment-draw', dayId: trip?.days[0]?.id ?? '', segIdx: 0 });
              }
            }}
            onCancelDraw={cancelPick}
          />
          <MapTooltip
            target={tooltip}
            added={tooltip ? useAppStore.getState().isListed(tooltip.poi.kind, tooltip.poi.id) : false}
            onAdd={(poi) => useAppStore.getState().addToList(poi)}
          />
          <ElevationProfile />
        </MapViewer>
        {pickHint && (
          <div className="pick-banner">
            <span className="pick-dot" />
            {pickHint}
            <button className="pick-cancel" onClick={cancelPick}>取消</button>
          </div>
        )}
        {tooltip && <div className="tooltip-note">点击图钉可加入收藏列表</div>}
      </main>
    </div>
  );
}
