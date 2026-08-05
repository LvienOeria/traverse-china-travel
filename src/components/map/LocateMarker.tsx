import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { useAppStore } from '../../store/appStore';
import { usePickStore } from '../../store/pickStore';
import { useViewer } from './MapViewer';

const AMBER = '#E8A33D';
const WHITE = '#FFFFFF';

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
 * Locate-target marker: a prominent pin, vertical beam and a name label.
 * Cleared by clicking anywhere else on the map (except during pick modes).
 */
export default function LocateMarker() {
  const { viewer } = useViewer();
  const target = useAppStore((s) => s.locateTarget);
  const setLocateTarget = useAppStore((s) => s.setLocateTarget);
  const entitiesRef = useRef<Cesium.Entity[]>([]);

  useEffect(() => {
    if (!viewer) return;
    for (const e of entitiesRef.current) viewer.entities.remove(e);
    entitiesRef.current = [];
    if (!target) return;
    const { lat, lng, name } = target;
    const list: Cesium.Entity[] = [];
    const ground = Cesium.Cartesian3.fromDegrees(lng, lat, 0);
    const top = Cesium.Cartesian3.fromDegrees(lng, lat, 4200);

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

    // prominent pin + name label
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
