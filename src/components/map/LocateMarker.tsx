import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { getViewer } from '../../lib/cesium';
import { useAppStore } from '../../store/appStore';
import { usePickStore } from '../../store/pickStore';
import { useViewer } from './MapViewer';

const AMBER = '#E8A33D';
const WHITE = '#FFFFFF';

function makeRingTexture(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = 160;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(80, 80, 24, 80, 80, 79);
  g.addColorStop(0, 'rgba(232,163,61,0)');
  g.addColorStop(0.5, 'rgba(232,163,61,0.18)');
  g.addColorStop(0.72, 'rgba(232,163,61,0.5)');
  g.addColorStop(1, 'rgba(232,163,61,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 160, 160);
  ctx.strokeStyle = 'rgba(255,214,140,0.95)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(80, 80, 74, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(80, 80, 62, 0, Math.PI * 2);
  ctx.stroke();
  return c;
}

function makeTargetPinSvg(): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="88" height="96" viewBox="0 0 44 48">
      <path d="M22 1C11 1 3 9.2 3 20.4 3 32 22 47 22 47S41 32 41 20.4C41 9.2 33 1 22 1z" fill="#E8A33D" stroke="#FFFFFF" stroke-width="2"/>
      <circle cx="22" cy="20.5" r="14" fill="#FFF3DC" opacity=".92"/>
      <circle cx="22" cy="20.5" r="8.5" fill="#E8A33D"/>
      <circle cx="22" cy="20.5" r="3.4" fill="#0B0E13"/>
    </svg>`,
  )}`;
}

/**
 * Prominent locate-target marker: ground glow ellipse, pulsing ring,
 * vertical beam and a name label — visible from far away.
 * Cleared by clicking anywhere else on the map (except during pick modes).
 */
export default function LocateMarker() {
  const { viewer } = useViewer();
  const target = useAppStore((s) => s.locateTarget);
  const setLocateTarget = useAppStore((s) => s.setLocateTarget);
  const entitiesRef = useRef<Cesium.Entity[]>([]);
  const epochRef = useRef(Cesium.JulianDate.now());

  useEffect(() => {
    if (!viewer) return;
    for (const e of entitiesRef.current) viewer.entities.remove(e);
    entitiesRef.current = [];
    if (!target) return;
    epochRef.current = Cesium.JulianDate.now();
    const { lat, lng, name } = target;
    const list: Cesium.Entity[] = [];
    const ground = Cesium.Cartesian3.fromDegrees(lng, lat, 0);
    const top = Cesium.Cartesian3.fromDegrees(lng, lat, 4200);

    // ground glow ellipse (radius scales with camera height)
    list.push(
      viewer.entities.add({
        id: 'locate-ellipse',
        position: ground,
        ellipse: {
          semiMajorAxis: new Cesium.CallbackProperty(() => {
            const h = getViewer()?.camera.positionCartographic.height ?? 50000;
            return Math.min(70000, Math.max(700, h * 0.16));
          }, false),
          semiMinorAxis: new Cesium.CallbackProperty(() => {
            const h = getViewer()?.camera.positionCartographic.height ?? 50000;
            return Math.min(70000, Math.max(700, h * 0.16));
          }, false),
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          material: Cesium.Color.fromCssColorString(AMBER).withAlpha(0.14),
          outline: true,
          outlineColor: Cesium.Color.fromCssColorString(AMBER).withAlpha(0.5),
          outlineWidth: 2,
        },
      }),
    );

    // pulsing ring billboard
    list.push(
      viewer.entities.add({
        id: 'locate-ring',
        position: Cesium.Cartesian3.fromDegrees(lng, lat, 30),
        billboard: {
          image: makeRingTexture(),
          width: 180,
          height: 180,
          verticalOrigin: Cesium.VerticalOrigin.CENTER,
          scale: new Cesium.CallbackProperty(() => {
            const t = ((Cesium.JulianDate.secondsDifference(Cesium.JulianDate.now(), epochRef.current) % 1.4) + 1.4) % 1.4 / 1.4;
            return 0.75 + 0.55 * Math.sin(t * Math.PI);
          }, false),
          color: new Cesium.CallbackProperty(() => {
            const t = ((Cesium.JulianDate.secondsDifference(Cesium.JulianDate.now(), epochRef.current) % 1.4) + 1.4) % 1.4 / 1.4;
            return Cesium.Color.fromCssColorString(AMBER).withAlpha(0.85 - 0.6 * Math.sin(t * Math.PI));
          }, false),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      }),
    );

    // vertical beam
    list.push(
      viewer.entities.add({
        id: 'locate-beam',
        polyline: {
          positions: [ground, top],
          width: 2.5,
          material: Cesium.Color.fromCssColorString(AMBER).withAlpha(0.65),
          arcType: Cesium.ArcType.NONE,
        },
      }),
    );

    // prominent pin
    list.push(
      viewer.entities.add({
        id: 'locate-pin',
        position: ground,
        billboard: {
          image: makeTargetPinSvg(),
          width: 52,
          height: 57,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          scaleByDistance: new Cesium.NearFarScalar(2e4, 1.0, 9e6, 0.9),
        },
        label: {
          text: name,
          font: '600 15px "Noto Sans SC", sans-serif',
          fillColor: Cesium.Color.fromCssColorString(WHITE),
          outlineColor: Cesium.Color.BLACK.withAlpha(0.75),
          outlineWidth: 4,
          pixelOffset: new Cesium.Cartesian2(0, -64),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          scaleByDistance: new Cesium.NearFarScalar(2e4, 1.0, 9e6, 0.85),
        },
      }),
    );

    entitiesRef.current = list;
    viewer.scene.requestRender();
    return () => {
      for (const e of entitiesRef.current) viewer.entities.remove(e);
      entitiesRef.current = [];
    };
  }, [viewer, target]);

  // click anywhere else clears the locate marker (except during pick modes)
  useEffect(() => {
    if (!viewer) return;
    const scene = viewer.scene;
    const handler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
    handler.setInputAction((e: { position: Cesium.Cartesian2 }) => {
      const pickMode = usePickStore.getState().mode;
      if (pickMode) return;
      if (!useAppStore.getState().locateTarget) return;
      const picked = scene.pick(e.position);
      if (picked?.id?.id?.startsWith?.('locate-')) return;
      setLocateTarget(null);
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    return () => handler.destroy();
  }, [viewer, setLocateTarget]);

  return null;
}
