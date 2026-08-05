import { useEffect, useState } from 'react';
import * as Cesium from 'cesium';
import { flyToChina, setPitch } from '../../lib/cesium';
import { useViewer } from './MapViewer';

interface Props {
  drawActive: boolean;
  onToggleDraw: () => void;
  onCancelDraw: () => void;
}

export default function MapControls({ drawActive, onToggleDraw, onCancelDraw }: Props) {
  const { viewer } = useViewer();
  const [pitchDeg, setPitchDeg] = useState(45);

  useEffect(() => {
    if (!viewer) return;
    let raf = 0;
    const loop = () => {
      const cam = viewer.camera;
      const pitch = Cesium.Math.toDegrees(-(cam.pitch + Cesium.Math.PI_OVER_TWO));
      setPitchDeg(Math.round(Math.min(90, Math.max(1, pitch))));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [viewer]);

  const handlePitch = (v: number) => {
    setPitchDeg(v);
    setPitch(v);
  };

  return (
    <div className="map-controls">
      <div className="ctrl-group">
        <button className={`ctrl-btn ${drawActive ? 'active' : ''}`} onClick={drawActive ? onCancelDraw : onToggleDraw} title="在地图上自由绘制路线">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19l7-7 3 3-7 7-3-3z" />
            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
            <circle cx="11" cy="11" r="2" />
          </svg>
          {drawActive ? '结束绘制' : '手绘路线'}
        </button>
        <button className="ctrl-btn" onClick={flyToChina} title="回到中国全景">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          全景
        </button>
      </div>
      <div className="pitch-widget" title="调整俯视角（纵轴高度视角）">
        <span className="pitch-label mono">{pitchDeg}°</span>
        <input
          type="range"
          min={5}
          max={90}
          value={pitchDeg}
          onChange={(e) => handlePitch(Number(e.target.value))}
          aria-label="俯视角"
        />
      </div>
    </div>
  );
}
