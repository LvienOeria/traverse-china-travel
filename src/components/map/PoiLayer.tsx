import { useEffect, useMemo, useRef, useState } from 'react';
import type * as L from 'leaflet';
import * as leaflet from 'leaflet';
import 'leaflet.markercluster';
import { makePoiIcon, project } from '../../lib/leaflet';
import type { Poi } from '../../lib/types';
import { loadPois } from '../../lib/data';
import { useAppStore } from '../../store/appStore';
import { useMap } from './MapViewer';

export interface TooltipTarget {
  poi: Poi;
  screenX: number;
  screenY: number;
}

interface Props {
  onHover?: (target: TooltipTarget | null) => void;
  onPick?: (poi: Poi) => void;
}

const POI_COLOR = '#57C785';

export default function PoiLayer({ onHover, onPick }: Props) {
  const { map } = useMap();
  const groupRef = useRef<L.MarkerClusterGroup | null>(null);
  const [pois, setPois] = useState<Poi[]>([]);

  const showPois = useAppStore((s) => s.showPois);
  const scenicList = useAppStore((s) => s.scenicList);
  const listed = useMemo(() => new Map(scenicList.map((l) => [l.poi.id, l.visible])), [scenicList]);

  // load data
  useEffect(() => {
    let cancelled = false;
    loadPois('spots').then((arr) => {
      if (!cancelled) setPois(arr);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // build markers in cluster group
  useEffect(() => {
    if (!map) return;
    const group = leaflet.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 52,
      spiderfyOnMaxZoom: true,
      disableClusteringAtZoom: 13,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        return leaflet.divIcon({
          className: 'trav-cluster',
          html: `<div class="trav-cluster-inner"><span>${count}</span></div>`,
          iconSize: [46, 46],
          iconAnchor: [23, 23],
        });
      },
    });
    group.addTo(map);
    groupRef.current = group;

    const rebuild = () => {
      group.clearLayers();
      if (!showPois) return;
      for (const poi of pois) {
        const itemVisible = listed.get(poi.id);
        if (itemVisible === false) continue;
        const highlighted = itemVisible === true;
        const marker = leaflet.marker([poi.lat, poi.lng], {
          icon: makePoiIcon(POI_COLOR, highlighted),
          title: poi.name,
          keyboard: false,
        });
        marker.on('mouseover', () => {
          const pt = project({ lat: poi.lat, lng: poi.lng });
          if (onHover && pt) onHover({ poi, screenX: pt.x, screenY: pt.y });
        });
        marker.on('mouseout', () => onHover?.(null));
        marker.on('click', () => onPick?.(poi));
        group.addLayer(marker);
      }
    };
    rebuild();
    return () => {
      group.clearLayers();
      if (groupRef.current) map.removeLayer(groupRef.current);
      groupRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, pois, showPois, listed]);

  return null;
}
