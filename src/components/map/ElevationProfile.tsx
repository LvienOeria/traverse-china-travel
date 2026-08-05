import { useEffect, useMemo, useState } from 'react';
import { sampleHeights } from '../../lib/cesium';
import { useTripStore } from '../../store/tripStore';
import { useAppStore } from '../../store/appStore';

interface ProfPoint {
  distKm: number;
  elev: number;
  color: string;
  time: number;
}

/**
 * Elevation profile strip: shows the terrain altitude along all chosen
 * routes of the trip (decimated sampling for performance).
 */
export default function ElevationProfile() {
  const trip = useTripStore((s) => s.trip);
  const showRoutes = useAppStore((s) => s.settings.showRoutes);
  const [data, setData] = useState<ProfPoint[] | null>(null);
  const [open, setOpen] = useState(true);
  const [busy, setBusy] = useState(false);

  const dayColors = useMemo(() => {
    const m = new Map<string, string>();
    trip?.days.forEach((d) => m.set(d.id, d.color));
    return m;
  }, [trip]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!trip || !showRoutes) {
        setData(null);
        return;
      }
      setBusy(true);
      const all: ProfPoint[] = [];
      for (const day of trip.days) {
        for (let i = 0; i < day.segments.length; i++) {
          const seg = day.segments[i];
          if (seg.chosen === null) continue;
          const route = seg.routes[seg.chosen];
          if (!route || route.geometry.length < 2) continue;
          const wpA = day.waypoints.find((w) => w.id === seg.fromId);
          const wpB = day.waypoints.find((w) => w.id === seg.toId);
          if (!wpA || !wpB) continue;
          const decimated = route.geometry.filter((_, idx) => idx % 3 === 0);
          if (decimated.length < 2) decimated.push(route.geometry[route.geometry.length - 1]);
          const samples = await sampleHeights(decimated);
          const timeA = wpA.time.split(':').map(Number);
          const timeB = wpB.time.split(':').map(Number);
          let tA = timeA[0] * 60 + (timeA[1] || 0);
          let tB = timeB[0] * 60 + (timeB[1] || 0);
          if (tB < tA) tB += 1440;
          let dist = 0;
          let prevLat = 0;
          let prevLng = 0;
          samples.forEach((s, idx) => {
            if (idx > 0) {
              dist += Math.hypot((s.lat - prevLat) * 111.32, (s.lng - prevLng) * 111.32 * Math.cos((s.lat * Math.PI) / 180));
            }
            prevLat = s.lat;
            prevLng = s.lng;
            const k = samples.length > 1 ? idx / (samples.length - 1) : 0;
            all.push({ distKm: dist, elev: s.height, color: day.color, time: ((tA + (tB - tA) * k) / 60) % 24 });
          });
        }
      }
      if (!cancelled) {
        setData(all.length ? all : null);
        setBusy(false);
      }
    })().catch(() => {
      if (!cancelled) {
        setData(null);
        setBusy(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [trip, showRoutes, dayColors]);

  if (!data || !open) {
    if (!data && !busy) return null;
    if (!open && data)
      return (
        <button className="prof-toggle" onClick={() => setOpen(true)}>
          ⛰ 海拔剖面
        </button>
      );
    return null;
  }

  const W = 460;
  const H = 96;
  const maxE = Math.max(...data.map((d) => d.elev));
  const minE = Math.min(...data.map((d) => d.elev));
  const span = Math.max(maxE - minE, 50);
  const maxD = data[data.length - 1].distKm;

  const x = (d: number) => (d / Math.max(maxD, 1)) * W;
  const y = (e: number) => H - ((e - minE) / span) * (H - 14) - 6;

  let path = '';
  data.forEach((d, i) => {
    path += `${i === 0 ? 'M' : 'L'}${x(d.distKm).toFixed(1)},${y(d.elev).toFixed(1)}`;
  });

  return (
    <div className="elev-profile">
      <div className="prof-head">
        <span className="prof-title">海拔剖面</span>
        <span className="prof-stats mono">
          {minE.toFixed(0)}m – {maxE.toFixed(0)}m · {maxD.toFixed(0)} km
        </span>
        <button className="prof-close" onClick={() => setOpen(false)}>×</button>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none">
        <defs>
          <linearGradient id="prof-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(232,163,61,0.35)" />
            <stop offset="100%" stopColor="rgba(232,163,61,0.02)" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((k) => (
          <line key={k} x1={W * k} y1={0} x2={W * k} y2={H} stroke="rgba(244,239,230,0.07)" strokeDasharray="2 4" />
        ))}
        <line x1={0} y1={y(minE + span * 0.25)} x2={W} y2={y(minE + span * 0.25)} stroke="rgba(244,239,230,0.06)" />
        <path d={`${path}L${W},${H}L0,${H}Z`} fill="url(#prof-fill)" />
        <path d={path} fill="none" stroke="#E8A33D" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
        {data
          .filter((_, i) => i % Math.max(1, Math.floor(data.length / 6)) === 0)
          .map((d, i) => (
            <g key={i}>
              <circle cx={x(d.distKm)} cy={y(d.elev)} r="2.2" fill={d.color} />
              <text x={x(d.distKm)} y={H - 2} fontSize="8" fill="rgba(244,239,230,0.45)" textAnchor="middle">
                {(d.time % 24).toFixed(0).padStart(2, '0')}:00
              </text>
            </g>
          ))}
      </svg>
    </div>
  );
}
