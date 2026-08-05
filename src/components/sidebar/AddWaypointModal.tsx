import type { Poi } from '../../lib/types';
import { useAppStore } from '../../store/appStore';
import { usePickStore } from '../../store/pickStore';
import { useTripStore } from '../../store/tripStore';
import { geocodeQuery } from '../../lib/network';
import SearchBox, { type SearchHit } from './SearchBox';

interface Props {
  dayId: string;
  onClose: () => void;
}

export default function AddWaypointModal({ dayId, onClose }: Props) {
  const addWaypoint = useTripStore((s) => s.addWaypoint);
  const requestPick = usePickStore((s) => s.requestPick);
  const scenicList = useAppStore((s) => s.scenicList);
  const airportList = useAppStore((s) => s.airportList);
  const stationList = useAppStore((s) => s.stationList);

  const quickPois = [...scenicList, ...airportList, ...stationList]
    .filter((l) => l.visible)
    .map((l) => l.poi)
    .slice(0, 40);

  const timeNow = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const addHit = (hit: SearchHit, kind: 'poi' | 'custom' | 'drawn') => {
    addWaypoint(dayId, {
      type: kind,
      name: hit.name,
      lat: hit.lat,
      lng: hit.lng,
      time: timeNow(),
      poiId: hit.poi?.id,
    });
    onClose();
  };

  const onPick = (hit: SearchHit) => {
    if (hit.kind === 'custom') addHit(hit, 'custom');
    else addHit(hit, 'poi');
  };

  const pickOnMap = () => {
    requestPick({ kind: 'waypoint', dayId });
    onClose();
  };

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal add-wp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>添加途经点</h3>
          <button className="mini-btn" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <SearchBox
            placeholder="搜索景点 / 车站 / 机场 / 任意地名…（回车联网搜索）"
            kinds={['scenic', 'airport', 'station']}
            onPick={onPick}
            autoFocus
            extra={async (q) => {
              const results = await geocodeQuery(q);
              return results.map((r, i) => ({
                id: `geo-${i}-${r.lng}-${r.lat}`,
                name: r.name,
                sub: '在线地名',
                kind: 'custom' as const,
                lat: r.lat,
                lng: r.lng,
              }));
            }}
          />
          <button className="map-pick-btn" onClick={pickOnMap}>
            <span className="map-pick-ico">◎</span> 在地图上直接选择位置
          </button>
          {quickPois.length > 0 && (
            <>
              <div className="quick-title">我的收藏中可选</div>
              <div className="quick-grid">
                {quickPois.map((poi: Poi) => (
                  <button
                    key={poi.id}
                    className="quick-chip"
                    onClick={() =>
                      addHit(
                        { id: poi.id, name: poi.name, sub: '', img: poi.img, kind: poi.kind, lat: poi.lat, lng: poi.lng, poi },
                        'poi',
                      )
                    }
                  >
                    {poi.img && (
                      <img src={poi.img} alt="" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
                    )}
                    {poi.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="modal-foot">
          <span className="hint-text">同一天内允许重复使用同一途经点（如晚归酒店）</span>
        </div>
      </div>
    </div>
  );
}
