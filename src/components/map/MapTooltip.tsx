import { useEffect, useRef, useState } from 'react';
import type { Poi } from '../../lib/types';

interface Props {
  target: { poi: Poi; screenX: number; screenY: number } | null;
  onAdd?: (poi: Poi) => void;
  added?: boolean;
}

export default function MapTooltip({ target, onAdd, added }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!target || !ref.current) return;
    const el = ref.current;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    let x = target.screenX + 18;
    let y = target.screenY - h - 10;
    if (x + w > window.innerWidth - 8) x = target.screenX - w - 18;
    if (y < 8) y = target.screenY + 24;
    setPos({ x, y });
  }, [target]);

  if (!target) return null;
  const { poi } = target;

  return (
    <div ref={ref} className="map-tooltip" style={{ left: pos.x, top: pos.y }}>
      <div className="tooltip-media">
        {poi.img ? (
          <img src={poi.img} alt={poi.name} loading="lazy" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
        ) : (
          <div className="tooltip-media-fallback">⛰</div>
        )}
        <span className="tooltip-kind">景点</span>
      </div>
      <div className="tooltip-body">
        <div className="tooltip-name">{poi.name}</div>
        {poi.en && <div className="tooltip-en">{poi.en}</div>}
        <div className="tooltip-coord mono">
          {poi.lat.toFixed(4)}° N · {poi.lng.toFixed(4)}° E
        </div>
        {onAdd && (
          <button className="tooltip-add" onClick={() => onAdd(poi)} disabled={added}>
            {added ? '✓ 已在列表' : '+ 添加到列表'}
          </button>
        )}
      </div>
    </div>
  );
}
