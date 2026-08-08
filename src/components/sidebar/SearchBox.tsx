import { useEffect, useRef, useState } from 'react';
import type { Poi } from '../../lib/types';

export interface SearchHit {
  id: string;
  name: string;
  sub: string;
  img?: string;
  kind: 'scenic' | 'custom';
  lat: number;
  lng: number;
  poi?: Poi;
}

interface Props {
  placeholder: string;
  kinds: ('scenic')[];
  onPick: (hit: SearchHit) => void;
  extra?: (q: string) => Promise<SearchHit[]>;
  autoFocus?: boolean;
}

export default function SearchBox({ placeholder, kinds, onPick, extra, autoFocus }: Props) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const query = q.trim();
    if (query.length < 1) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      const mySeq = ++seq.current;
      const hits: SearchHit[] = [];
      const lower = query.toLowerCase();
      for (const kind of kinds) {
        const file = kind === 'scenic' ? 'spots' : kind === 'airport' ? 'airports' : 'stations';
        const { loadPois } = await import('../../lib/data');
        const arr = await loadPois(file as 'spots');
        for (const p of arr) {
          if (p.name.includes(query) || p.name.toLowerCase().includes(lower) || (p.en || '').toLowerCase().includes(lower)) {
            hits.push({
              id: `poi-${p.id}`,
              name: p.name,
              sub: p.en || '景点',
              img: p.img,
              kind: 'scenic',
              lat: p.lat,
              lng: p.lng,
              poi: p,
            });
            if (hits.length >= 24) break;
          }
        }
        if (hits.length >= 24) break;
      }
      if (mySeq !== seq.current) return;
      setResults(hits);
      setOpen(true);
      setLoading(false);
    }, 220);
  }, [q, kinds]);

  const doExternal = async () => {
    const query = q.trim();
    if (!query || !extra) return;
    setLoading(true);
    const found = await extra(query);
    if (found.length) {
      setResults((prev) => {
        const seen = new Set(prev.map((r) => r.id));
        const merged = [...prev, ...found.filter((f) => !seen.has(f.id))];
        return merged.slice(0, 30);
      });
      setOpen(true);
    }
    setLoading(false);
  };

  const pick = (hit: SearchHit) => {
    onPick(hit);
    setQ('');
    setResults([]);
    setOpen(false);
  };

  return (
    <div className="search-box" ref={boxRef}>
      <div className="search-input-wrap">
        <svg className="search-ico" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void doExternal();
          }}
          placeholder={placeholder}
          autoFocus={autoFocus}
        />
        {loading && <span className="search-loading" />}
      </div>
      {open && results.length > 0 && (
        <div className="search-results">
          {results.map((r) => (
            <button key={r.id} className="search-item" onClick={() => pick(r)}>
              {r.img ? (
                <img src={r.img} alt="" loading="lazy" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
              ) : (
                <span className="search-item-fallback k-scenic">⛰</span>
              )}
              <span className="search-item-text">
                <span className="search-item-name">{r.name}</span>
                <span className="search-item-sub">{r.sub}</span>
              </span>
              <span className="search-item-kind k-scenic">{r.kind === 'custom' ? '自定义' : '景点'}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
