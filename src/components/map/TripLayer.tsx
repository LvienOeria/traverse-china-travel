import { useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import { drapeRoute, makePinSvg } from '../../lib/cesium';
import type { DayPlan, Waypoint } from '../../lib/types';
import { mixHex, timeColor } from '../../lib/types';
import { useAppStore } from '../../store/appStore';
import { useTripStore } from '../../store/tripStore';
import { useViewer } from './MapViewer';

interface Props {
  onPoiClicked?: (wp: Waypoint, day: DayPlan) => void;
}

/** time at a route vertex: linear interpolate between segment endpoint times */
function vertexTime(wpA: Waypoint, wpB: Waypoint, k: number): number {
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + (m || 0);
  };
  const a = toMin(wpA.time || '08:00');
  const b = toMin(wpB.time || '18:00');
  let d = b - a;
  if (d < 0) d += 24 * 60;
  return ((a + d * k) / 60) % 24;
}

function segmentColor(dayColor: string, t: number): string {
  return mixHex(dayColor, timeColor(t), 0.62);
}

export default function TripLayer({ onPoiClicked }: Props) {
  const { viewer } = useViewer();
  const trip = useTripStore((s) => s.trip);
  const settings = useAppStore((s) => s.settings);
  const drawnRef = useRef<Cesium.Entity[]>([]);

  // draw waypoints + routes
  useEffect(() => {
    if (!viewer) return;
    let cancelled = false;
    const cleanup = () => {
      for (const e of drawnRef.current) viewer.entities.remove(e);
      drawnRef.current = [];
    };

    const draw = async () => {
      cleanup();
      if (!trip) return;
      const list: Cesium.Entity[] = [];

      for (const day of trip.days) {
        // waypoint pins
        day.waypoints.forEach((wp, idx) => {
          const pin = makePinSvg('scenic', day.color, true);
          list.push(
            viewer.entities.add({
              id: `twp-${day.id}-${wp.id}`,
              position: Cesium.Cartesian3.fromDegrees(wp.lng, wp.lat),
              billboard: {
                image: pin,
                width: 26,
                height: 29,
                verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
                scaleByDistance: new Cesium.NearFarScalar(1.5e5, 1.0, 4.0e6, 0.6),
              },
              label: {
                text: `${idx + 1}`,
                font: '700 13px "IBM Plex Mono", monospace',
                fillColor: Cesium.Color.WHITE,
                outlineColor: Cesium.Color.BLACK.withAlpha(0.55),
                outlineWidth: 3,
                pixelOffset: new Cesium.Cartesian2(0, -30),
                disableDepthTestDistance: Number.POSITIVE_INFINITY,
                show: settings.showWaypoints,
              },
              properties: { wpId: wp.id, dayId: day.id } as never,
            }),
          );
        });

        // routes: one small polyline per vertex pair → smooth time gradient
        const segs = day.segments ?? [];
        for (let i = 0; i < segs.length; i++) {
          const seg = segs[i];
          if (seg.chosen === null) continue;
          const route = seg.routes[seg.chosen];
          if (!route) continue;
          const wpA = day.waypoints.find((w) => w.id === seg.fromId);
          const wpB = day.waypoints.find((w) => w.id === seg.toId);
          if (!wpA || !wpB) continue;
          const positions = await drapeRoute(route.geometry);
          if (cancelled) return;
          if (cancelled) return;
          for (let v = 0; v < positions.length - 1; v++) {
            const k = route.geometry.length > 1 ? v / (route.geometry.length - 1) : 0;
            const t = vertexTime(wpA, wpB, k);
            list.push(
              viewer.entities.add({
                id: `troute-${day.id}-${i}-${v}`,
                polyline: {
                  positions: [positions[v], positions[v + 1]],
                  width: settings.routeThickness,
                  material: Cesium.Color.fromCssColorString(segmentColor(day.color, t)),
                  arcType: Cesium.ArcType.NONE,
                },
              }),
            );
          }
        }
      }
      drawnRef.current = list;
      viewer.scene.requestRender();
    };

    void draw().catch(() => undefined);
    return () => {
      cancelled = true;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewer, trip, settings.routeThickness, settings.showRoutes, settings.showWaypoints]);

  // hover / click picking for waypoint pins
  useEffect(() => {
    if (!viewer) return;
    const scene = viewer.scene;
    const handler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
    handler.setInputAction((e: { position?: Cesium.Cartesian2; endPosition?: Cesium.Cartesian2 }) => {
      const pos = e.endPosition ?? e.position;
      const picked = pos ? scene.pick(pos) : null;
      const id = picked?.id?.id ?? '';
      scene.canvas.style.cursor = id.startsWith('twp-') ? 'pointer' : 'default';
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
    handler.setInputAction((e: { position: Cesium.Cartesian2 }) => {
      const picked = scene.pick(e.position);
      const id = picked?.id?.id ?? '';
      if (id.startsWith('twp-') && trip && onPoiClicked) {
        const parts = id.split('-');
        const dayId = parts[1];
        const wpId = parts.slice(2).join('-');
        const day = trip.days.find((d) => d.id === dayId);
        const wp = day?.waypoints.find((w) => w.id === wpId);
        if (day && wp) onPoiClicked(wp, day);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
    return () => handler.destroy();
  }, [viewer, trip, onPoiClicked]);

  return null;
}
