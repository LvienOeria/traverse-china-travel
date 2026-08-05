import { useEffect, useMemo, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import { makePinSvg } from '../../lib/cesium';
import type { Poi, PoiKind } from '../../lib/types';
import { loadPois } from '../../lib/data';
import { useAppStore } from '../../store/appStore';
import { useViewer } from './MapViewer';

export interface TooltipTarget {
  poi: Poi;
  screenX: number;
  screenY: number;
}

interface Props {
  onHover?: (target: TooltipTarget | null) => void;
  onPick?: (poi: Poi) => void;
}

const KIND_COLOR: Record<PoiKind, string> = {
  scenic: '#57C785',
  airport: '#5FA8E8',
  station: '#E8796C',
};

const dsMap = new WeakMap<Cesium.Viewer, Cesium.CustomDataSource>();
function ensurePoiDs(viewer: Cesium.Viewer): Cesium.CustomDataSource {
  let ds = dsMap.get(viewer);
  if (!ds) {
    ds = new Cesium.CustomDataSource('poi-layer');
    ds.clustering.enabled = true;
    ds.clustering.pixelRange = 46;
    ds.clustering.minimumClusterSize = 2;
    ds.clustering.clusterEvent.addEventListener((entities, cluster) => {
      cluster.label.show = false;
      cluster.point.show = false;
      cluster.billboard.image = makeClusterSvg(entities.length);
      cluster.billboard.width = 44;
      cluster.billboard.height = 44;
      cluster.billboard.verticalOrigin = Cesium.VerticalOrigin.BOTTOM;
      cluster.billboard.disableDepthTestDistance = Number.POSITIVE_INFINITY;
    });
    viewer.dataSources.add(ds);
    dsMap.set(viewer, ds);
  }
  return ds;
}

export default function PoiLayer({ onHover, onPick }: Props) {
  const { viewer } = useViewer();
  const dsRef = useRef<Cesium.CustomDataSource | null>(null);
  const [pois, setPois] = useState<{ scenic: Poi[]; airport: Poi[]; station: Poi[] }>({
    scenic: [],
    airport: [],
    station: [],
  });

  const visibility = useAppStore((s) => s.visibility);
  const scenicList = useAppStore((s) => s.scenicList);
  const airportList = useAppStore((s) => s.airportList);
  const stationList = useAppStore((s) => s.stationList);
  const lists = useMemo(
    () => ({ scenic: scenicList, airport: airportList, station: stationList }),
    [scenicList, airportList, stationList],
  );

  // data source with clustering
  useEffect(() => {
    if (!viewer) return;
    dsRef.current = ensurePoiDs(viewer);
  }, [viewer]);

  // load POI data
  useEffect(() => {
    let cancelled = false;
    const jobs = (['scenic', 'airport', 'station'] as const).map((kind) => {
      const file = kind === 'scenic' ? 'spots' : kind === 'airport' ? 'airports' : 'stations';
      return loadPois(file);
    });
    Promise.all(jobs).then(([scenic, airport, station]) => {
      if (!cancelled) setPois({ scenic, airport, station });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Build markers
  useEffect(() => {
    const ds = dsRef.current;
    if (!ds) return;
    ds.entities.removeAll();
    const list: Cesium.Entity[] = [];

    const addPois = (kind: PoiKind, arr: Poi[], listed: Map<string, boolean>) => {
      if (!visibility[kind]) return;
      for (const poi of arr) {
        const listedVisible = listed.get(poi.id);
        if (listedVisible === false) continue;
        const highlighted = listedVisible === true;
        const pin = makePinSvg(kind, KIND_COLOR[kind], highlighted);
        list.push(
          ds.entities.add({
            id: `poi-${poi.id}`,
            position: Cesium.Cartesian3.fromDegrees(poi.lng, poi.lat),
            billboard: {
              image: pin,
              width: highlighted ? 40 : 28,
              height: highlighted ? 44 : 30,
              verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
              disableDepthTestDistance: Number.POSITIVE_INFINITY,
              scaleByDistance: new Cesium.NearFarScalar(1.5e5, 1.0, 4.0e6, 0.55),
            },
            properties: { poiKind: kind, poiId: poi.id } as never,
          }),
        );
      }
    };
    const mk = (l: { poi: Poi; visible: boolean }[]) => new Map(l.map((x) => [x.poi.id, x.visible]));
    addPois('scenic', pois.scenic, mk(lists.scenic));
    addPois('airport', pois.airport, mk(lists.airport));
    addPois('station', pois.station, mk(lists.station));
    return () => {
      ds.entities.removeAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewer, pois, visibility, lists]);

  // Hover / click picking
  useEffect(() => {
    if (!viewer) return;
    const scene = viewer.scene;
    const handler = new Cesium.ScreenSpaceEventHandler(scene.canvas);

    const pickPoi = (pos: Cesium.Cartesian2): Cesium.Entity | null => {
      const picked = scene.pick(pos);
      if (!picked?.id?.id?.startsWith?.('poi-')) return null;
      return picked.id;
    };

    handler.setInputAction((e: { position?: Cesium.Cartesian2; endPosition?: Cesium.Cartesian2 }) => {
      const pos = e.endPosition ?? e.position;
      const ent = pos ? pickPoi(pos) : null;
      if (ent) {
        const props = ent.properties as unknown as {
          poiKind: { getValue: (t: Cesium.JulianDate) => string };
          poiId: { getValue: (t: Cesium.JulianDate) => string };
        };
        const kind = props.poiKind.getValue(Cesium.JulianDate.now()) as PoiKind;
        const poiIdStr = props.poiId.getValue(Cesium.JulianDate.now());
        const arr = pois[kind] ?? [];
        const poi = arr.find((p) => p.id === poiIdStr);
        if (poi && onHover && pos) onHover({ poi, screenX: pos.x, screenY: pos.y });
        scene.canvas.style.cursor = 'pointer';
      } else {
        if (onHover) onHover(null);
        scene.canvas.style.cursor = 'default';
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    handler.setInputAction((e: { position: Cesium.Cartesian2 }) => {
      const ent = pickPoi(e.position);
      if (ent) {
        const props = ent.properties as unknown as {
          poiKind: { getValue: (t: Cesium.JulianDate) => string };
          poiId: { getValue: (t: Cesium.JulianDate) => string };
        };
        const kind = props.poiKind.getValue(Cesium.JulianDate.now()) as PoiKind;
        const poiIdStr = props.poiId.getValue(Cesium.JulianDate.now());
        const poi = pois[kind]?.find((p) => p.id === poiIdStr);
        if (poi && onPick) onPick(poi);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    return () => handler.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewer, pois, onHover, onPick]);

  return null;
}

function makeClusterSvg(count: number): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56">
      <circle cx="28" cy="28" r="24" fill="#12161D" stroke="#E8A33D" stroke-width="2"/>
      <circle cx="28" cy="28" r="19" fill="none" stroke="#E8A33D" stroke-opacity=".35" stroke-width="1.5" stroke-dasharray="3 3"/>
      <text x="28" y="34" font-family="IBM Plex Mono, monospace" font-size="17" fill="#F4EFE6" text-anchor="middle" font-weight="600">${count}</text>
    </svg>`,
  )}`;
}
