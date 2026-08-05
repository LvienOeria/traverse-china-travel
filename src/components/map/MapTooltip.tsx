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
    let x = target.screenX + 16;
    let y = target.screenY - h - 8;
    if (x + w > window.innerWidth - 8) x = target.screenX - w - 16;
    if (y < 8) y = target.screenY + 20;
    setPos({ x, y });
  }, [target]);

  if (!target) return null;
  const { poi } = target;

  const kindLabel =
    poi.kind === 'scenic' ? '景点' : poi.kind === 'airport' ? '机场' : poi.kind === 'station' ? '火车站' : '';
  const kindClass =
    poi.kind === 'scenic' ? 'tip-scenic' : poi.kind === 'airport' ? 'tip-airport' : 'tip-station';

  return (
    <div ref={ref} className={`map-tooltip ${kindClass}`} style={{ left: pos.x, top: pos.y }}>
      <div className="tooltip-media">
        {poi.img ? (
          <img src={poi.img} alt={poi.name} loading="lazy" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
        ) : (
          <div className="tooltip-media-fallback">{poi.kind === 'airport' ? '✈' : poi.kind === 'station' ? '🚄' : '⛰'}</div>
        )}
        <span className="tooltip-kind">{kindLabel}</span>
        {poi.kind === 'airport' && poi.code && <span className="tooltip-code mono">{poi.code}</span>}
        {poi.kind === 'station' && (poi as { hsr?: boolean }).hsr && <span className="tooltip-hsr">高铁</span>}
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
