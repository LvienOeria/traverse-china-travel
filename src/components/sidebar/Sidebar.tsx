import { useEffect, useState } from 'react';
import PoiPanel from './PoiPanel';
import PlannerPanel from './PlannerPanel';
import SettingsPanel from './SettingsPanel';
import { loadStats } from '../../lib/data';

type Tab = 'poi' | 'plan' | 'settings';

export default function Sidebar() {
  const [tab, setTab] = useState<Tab>('poi');
  const [stats, setStats] = useState<{ spots: number; airports: number; stations: number } | null>(null);

  useEffect(() => {
    loadStats().then(setStats);
  }, []);

  return (
    <aside className="sidebar">
      <header className="sidebar-head">
        <div className="brand">
          <div className="brand-mark">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M3 17l6-8 4 5 4-6 4 9" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M3 21h18" strokeLinecap="round" />
              <circle cx="7" cy="8" r="2.2" />
              <circle cx="17" cy="6" r="1.8" />
            </svg>
          </div>
          <div className="brand-text">
            <h1>途迹<span className="brand-en">TRAVERSE</span></h1>
            <p>中国 · 可视化旅行规划</p>
          </div>
        </div>
        <nav className="sidebar-tabs">
          <button className={tab === 'poi' ? 'tab active' : 'tab'} onClick={() => setTab('poi')}>
            图钉
          </button>
          <button className={tab === 'plan' ? 'tab active' : 'tab'} onClick={() => setTab('plan')}>
            行程
          </button>
          <button className={tab === 'settings' ? 'tab active' : 'tab'} onClick={() => setTab('settings')}>
            设置
          </button>
        </nav>
      </header>
      <div className="sidebar-body">
        {tab === 'poi' && <PoiPanel />}
        {tab === 'plan' && <PlannerPanel />}
        {tab === 'settings' && <SettingsPanel />}
      </div>
      <footer className="sidebar-foot mono">
        <span>OSM 数据 · OSRM 路线</span>
        <span className="dot" />
        <span>{stats ? `${stats.spots} 景点 · ${stats.airports} 机场 · ${stats.stations} 车站` : '…'}</span>
      </footer>
    </aside>
  );
}
