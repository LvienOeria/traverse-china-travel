import { useEffect, useRef } from 'react';
import type * as L from 'leaflet';
import * as leaflet from 'leaflet';
import { makeDayIcon, project } from '../../lib/leaflet';
import { useTripStore } from '../../store/tripStore';
import { useAppStore } from '../../store/appStore';
import { useMap } from './MapViewer';

interface Props {
  onHover?: (wp: { name: string; time: string; dayColor: string; dayLabel: string } | null, target?: { screenX: number; screenY: number }) => void;
}

export default function TripLayer({ onHover }: Props) {
  const { map } = useMap();
  const trip = useTripStore((s) => s.trip);
  const showWaypoints = useAppStore((s) => s.settings.showWaypoints);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!map) return;
    if (!layerRef.current) {
      layerRef.current = leaflet.layerGroup().addTo(map);
    }
    const layer = layerRef.current;
    layer.clearLayers();
    if (!trip) return;

    trip.days.forEach((day) => {
      day.waypoints.forEach((wp, idx) => {
        const marker = leaflet.marker([wp.lat, wp.lng], {
          icon: makeDayIcon(day.color, idx + 1),
          keyboard: false,
        });
        marker.on('mouseover', () => {
          const pt = project({ lat: wp.lat, lng: wp.lng });
          if (onHover && pt) {
            onHover({ name: wp.name, time: wp.time, dayColor: day.color, dayLabel: day.label }, { screenX: pt.x, screenY: pt.y });
          }
        });
        marker.on('mouseout', () => onHover?.(null));
        layer.addLayer(marker);
      });
    });

    return () => {
      layer.clearLayers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, trip, showWaypoints, onHover]);

  return null;
}
