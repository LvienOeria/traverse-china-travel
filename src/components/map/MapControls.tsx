import { useEffect, useState } from 'react';
import { flyToChina, getMap } from '../../lib/leaflet';

export default function MapControls() {
  const [zoom, setZoom] = useState(4.6);

  useEffect(() => {
    const map = getMap();
    if (!map) return;
    const update = () => setZoom(map.getZoom());
    map.on('zoomend', update);
    update();
    return () => {
      map.off('zoomend', update);
    };
  }, []);

  return (
    <div className="map-controls">
      <div className="ctrl-group">
        <button className="ctrl-btn" onClick={() => getMap()?.zoomIn(1, { animate: true })} title="放大">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
        <button className="ctrl-btn" onClick={() => getMap()?.zoomOut(1, { animate: true })} title="缩小">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M5 12h14" />
          </svg>
        </button>
        <button className="ctrl-btn" onClick={flyToChina} title="回到中国全景">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          全景
        </button>
      </div>
      <div className="zoom-indicator mono">z{zoom.toFixed(1)}</div>
    </div>
  );
}
