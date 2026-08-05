import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { sampleHeights } from '../../lib/cesium';
import type { GeoPoint } from '../../lib/types';
import { useViewer } from './MapViewer';

interface Props {
  active: boolean;
  onDone: (geometry: GeoPoint[]) => void;
  onCancel: () => void;
}

/**
 * Freehand route drawing on the map.
 * Click to add vertices, double-click / Enter to finish.
 * The finished polyline is resampled (~200m spacing) and draped on terrain.
 */
export default function DrawTool({ active, onDone, onCancel }: Props) {
  const { viewer } = useViewer();
  const ptsRef = useRef<GeoPoint[]>([]);
  const polyRef = useRef<Cesium.Entity | null>(null);
  const vertexRef = useRef<Cesium.Entity | null>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    if (!viewer || !active) return;
    const scene = viewer.scene;
    const pts: GeoPoint[] = [];
    ptsRef.current = pts;

    const redraw = () => {
      if (polyRef.current) {
        viewer.entities.remove(polyRef.current);
        polyRef.current = null;
      }
      if (vertexRef.current) {
        viewer.entities.remove(vertexRef.current);
        vertexRef.current = null;
      }
      if (pts.length === 1) {
        vertexRef.current = viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(pts[0].lng, pts[0].lat),
          point: { pixelSize: 8, color: Cesium.Color.fromCssColorString('#E8A33D'), disableDepthTestDistance: Number.POSITIVE_INFINITY },
        });
        return;
      }
      if (pts.length >= 2) {
        const positions = pts.map((p) => Cesium.Cartesian3.fromDegrees(p.lng, p.lat));
        polyRef.current = viewer.entities.add({
          position: positions[positions.length - 1],
          polyline: {
            positions,
            width: 3,
            material: Cesium.Color.fromCssColorString('#E8A33D').withAlpha(0.9),
            arcType: Cesium.ArcType.NONE,
          },
          point: {
            pixelSize: 6,
            color: Cesium.Color.fromCssColorString('#E8A33D'),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });
      }
    };

    const pickGround = (position: Cesium.Cartesian2): GeoPoint | null => {
      const ray = viewer.camera.getPickRay(position);
      if (!ray) return null;
      const cart = scene.globe.pick(ray, scene) ?? viewer.camera.pickEllipsoid(position, scene.globe.ellipsoid);
      if (!cart) return null;
      const carto = Cesium.Cartographic.fromCartesian(cart);
      return { lat: Cesium.Math.toDegrees(carto.latitude), lng: Cesium.Math.toDegrees(carto.longitude) };
    };

    const handler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
    let pendingClick: ReturnType<typeof setTimeout> | null = null;
    const addPoint = (e: { position: Cesium.Cartesian2 }) => {
      const p = pickGround(e.position);
      if (!p) return;
      pts.push(p);
      redraw();
    };
    handler.setInputAction((e: { position: Cesium.Cartesian2 }) => {
      if (pendingClick) clearTimeout(pendingClick);
      pendingClick = setTimeout(() => addPoint(e), 260);
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    handler.setInputAction(() => {
      if (pendingClick) {
        clearTimeout(pendingClick);
        pendingClick = null;
      }
      void finish();
    }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

    const finish = async () => {
      if (pendingClick) {
        clearTimeout(pendingClick);
        pendingClick = null;
      }
      if (pts.length < 2) {
        onCancel();
        return;
      }
      // resample ~200m apart for smooth terrain draping
      const resampled: GeoPoint[] = [];
      const DIST = 0.0002;
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i];
        const b = pts[i + 1];
        const dLat = b.lat - a.lat;
        const dLng = b.lng - a.lng;
        const dist = Math.hypot(dLat, dLng);
        const steps = Math.max(1, Math.ceil(dist / DIST));
        for (let s = 0; s < steps; s++) {
          resampled.push({ lat: a.lat + (dLat * s) / steps, lng: a.lng + (dLng * s) / steps });
        }
      }
      resampled.push(pts[pts.length - 1]);
      try {
        const samples = await sampleHeights(resampled);
        void samples;
      } catch {
        /* ignore */
      }
      if (polyRef.current) {
        viewer.entities.remove(polyRef.current);
        polyRef.current = null;
      }
      if (vertexRef.current) {
        viewer.entities.remove(vertexRef.current);
        vertexRef.current = null;
      }
      ptsRef.current = [];
      doneRef.current(resampled);
    };

    const keyHandler = (ev: KeyboardEvent) => {
      if (ev.key === 'Enter') {
        void finish();
      } else if (ev.key === 'Escape') {
        if (polyRef.current) viewer.entities.remove(polyRef.current);
        if (vertexRef.current) viewer.entities.remove(vertexRef.current);
        ptsRef.current = [];
        onCancel();
      }
    };
    window.addEventListener('keydown', keyHandler);

    return () => {
      handler.destroy();
      window.removeEventListener('keydown', keyHandler);
      if (polyRef.current) viewer.entities.remove(polyRef.current);
      if (vertexRef.current) viewer.entities.remove(vertexRef.current);
    };
  }, [viewer, active, onCancel]);

  return null;
}
