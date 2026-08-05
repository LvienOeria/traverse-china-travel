import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createContext, useContext } from 'react';
import * as Cesium from 'cesium';
import { applySettings, destroyViewer, getViewer, initViewer } from '../../lib/cesium';
import { useAppStore } from '../../store/appStore';

interface ViewerCtx {
  viewer: Cesium.Viewer | null;
  ready: boolean;
}

const Ctx = createContext<ViewerCtx>({ viewer: null, ready: false });
export const useViewer = () => useContext(Ctx);

export default function MapViewer({ children }: { children?: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewer, setViewer] = useState<Cesium.Viewer | null>(null);
  const settings = useAppStore((s) => s.settings);
  const prevSettingsRef = useRef(settings);

  useEffect(() => {
    let cancelled = false;
    const el = containerRef.current;
    if (!el) return;
    initViewer(el, settings).then((v) => {
      if (cancelled) return;
      setViewer(v);
    });
    return () => {
      cancelled = true;
      destroyViewer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (viewer) {
      const prev = prevSettingsRef.current;
      applySettings(viewer, settings, prev);
      prevSettingsRef.current = settings;
    }
  }, [viewer, settings]);

  useEffect(() => {
    const onResize = () => getViewer()?.resize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // arrow-key panning (skip when typing in inputs)
  useEffect(() => {
    if (!viewer) return;
    const onKey = (ev: KeyboardEvent) => {
      const t = ev.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      const dir =
        ev.key === 'ArrowLeft' ? 'left' :
        ev.key === 'ArrowRight' ? 'right' :
        ev.key === 'ArrowUp' ? 'up' :
        ev.key === 'ArrowDown' ? 'down' : null;
      if (!dir) return;
      ev.preventDefault();
      const cam = viewer.camera;
      const dist = cam.positionCartographic.height * 0.06;
      if (dir === 'left') cam.moveLeft(dist);
      else if (dir === 'right') cam.moveRight(dist);
      else if (dir === 'up') cam.moveUp(dist);
      else cam.moveDown(dist);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewer]);

  return (
    <div className="map-root" ref={containerRef}>
      <Ctx.Provider value={{ viewer, ready: !!viewer }}>{viewer ? children : null}</Ctx.Provider>
    </div>
  );
}
