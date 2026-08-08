import { useEffect, useRef } from 'react';
import type * as L from 'leaflet';
import * as leaflet from 'leaflet';
import { makeLocateIcon, flyToPoint } from '../../lib/leaflet';
import { useAppStore } from '../../store/appStore';
import { usePickStore } from '../../store/pickStore';
import { useMap } from './MapViewer';

/**
 * Locate-target marker: prominent amber pin + name label.
 * Cleared by clicking anywhere else on the map (except during pick modes).
 */
export default function LocateMarker() {
  const { map } = useMap();
  const target = useAppStore((s) => s.locateTarget);
  const setLocateTarget = useAppStore((s) => s.setLocateTarget);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!map) return;
    if (markerRef.current) {
      map.removeLayer(markerRef.current);
      markerRef.current = null;
    }
    if (!target) return;
    const marker = leaflet.marker([target.lat, target.lng], {
      icon: makeLocateIcon(),
      keyboard: false,
      interactive: false,
    });
    const label = leaflet.tooltip({
      direction: 'top',
      offset: [0, -58],
      className: 'trav-locate-label',
      permanent: true,
      interactive: false,
    });
    label.setContent(`<span>${target.name}</span>`);
    marker.bindTooltip(label);
    marker.addTo(map);
    markerRef.current = marker;
    flyToPoint(target.lat, target.lng);
    return () => {
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, target]);

  // click anywhere else clears the locate marker (except during pick modes)
  useEffect(() => {
    if (!map) return;
    const onClick = (e: L.LeafletMouseEvent) => {
      const pickMode = usePickStore.getState().mode;
      if (pickMode) return;
      if (!useAppStore.getState().locateTarget) return;
      const target = useAppStore.getState().locateTarget!;
      const d = Math.hypot(e.latlng.lat - target.lat, (e.latlng.lng - target.lng) * Math.cos((target.lat * Math.PI) / 180));
      if (d < 0.01) return;
      setLocateTarget(null);
    };
    map.on('click', onClick);
    return () => {
      map.off('click', onClick);
    };
  }, [map, setLocateTarget]);

  return null;
}
