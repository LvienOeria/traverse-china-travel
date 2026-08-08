import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createContext, useContext } from 'react';
import type * as L from 'leaflet';
import { applyMapSettings, destroyMap, initMap } from '../../lib/leaflet';
import { useAppStore } from '../../store/appStore';

interface MapCtx {
  map: L.Map | null;
  ready: boolean;
}

const Ctx = createContext<MapCtx>({ map: null, ready: false });
export const useMap = () => useContext(Ctx);

export default function MapViewer({ children }: { children?: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  const settings = useAppStore((s) => s.settings);
  const prevSettingsRef = useRef(settings);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const m = initMap(el, settings);
    setMap(m);
    return () => destroyMap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (map) {
      const prev = prevSettingsRef.current;
      applyMapSettings(settings, prev);
      prevSettingsRef.current = settings;
    }
  }, [map, settings]);

  useEffect(() => {
    if (!map) return;
    const onResize = () => map.invalidateSize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [map]);

  // arrow-key panning (skip when typing in inputs)
  useEffect(() => {
    if (!map) return;
    const onKey = (ev: KeyboardEvent) => {
      const t = ev.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      const dir =
        ev.key === 'ArrowLeft' ? [0, -1] :
        ev.key === 'ArrowRight' ? [0, 1] :
        ev.key === 'ArrowUp' ? [1, 0] :
        ev.key === 'ArrowDown' ? [-1, 0] : null;
      if (!dir) return;
      ev.preventDefault();
      const z = map.getZoom();
      const px = map.getSize().x * 0.22;
      const target = map.getCenter();
      const d = map.unproject(map.project(target).add([dir[1] * px, dir[0] * px]), z);
      map.panTo(d, { animate: true, duration: 0.18 });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [map]);

  return (
    <div className="map-root" ref={containerRef}>
      <Ctx.Provider value={{ map, ready: !!map }}>{map ? children : null}</Ctx.Provider>
    </div>
  );
}
