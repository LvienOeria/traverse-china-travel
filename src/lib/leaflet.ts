import * as L from 'leaflet';
import type { AppSettings, GeoPoint } from './types';
import { CHINA_BOUNDS } from './types';

let map: L.Map | null = null;
const mapState = { lat: 34.0, lng: 104.0, zoom: 4.6 };

export function getMap(): L.Map | null {
  return map;
}

function tileLayer(imagery: AppSettings['imagery']): L.TileLayer {
  if (imagery === 'satellite') {
    return L.tileLayer('https://webst{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}', {
      maxZoom: 18,
      subdomains: ['1', '2', '3', '4'],
      attribution: '© 高德地图',
    });
  }
  if (imagery === 'osm') {
    return L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap',
    });
  }
  return L.tileLayer('https://webrd{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=7&x={x}&y={y}&z={z}', {
    maxZoom: 18,
    subdomains: ['1', '2', '3', '4'],
    attribution: '© 高德地图',
  });
}

export function initMap(container: HTMLElement, settings: AppSettings): L.Map {
  if (map) return map;
  map = L.map(container, {
    center: [mapState.lat, mapState.lng],
    zoom: mapState.zoom,
    minZoom: 3.6,
    maxZoom: 17,
    zoomControl: false,
    attributionControl: true,
    maxBounds: L.latLngBounds([CHINA_BOUNDS[0], CHINA_BOUNDS[1]], [CHINA_BOUNDS[2], CHINA_BOUNDS[3]]),
    maxBoundsViscosity: 0.9,
    zoomAnimation: true,
    fadeAnimation: true,
    markerZoomAnimation: true,
    worldCopyJump: false,
  });
  map.setView([34.0, 104.0], 4.6);
  tileLayer(settings.imagery).addTo(map);
  (window as unknown as Record<string, unknown>).__map = map;
  return map;
}

export function destroyMap() {
  if (map) {
    map.remove();
    map = null;
  }
}

export function applyMapSettings(settings: AppSettings, prev?: AppSettings) {
  if (!map) return;
  if (prev && prev.imagery !== settings.imagery) {
    map.eachLayer((l) => {
      if (l instanceof L.TileLayer) map!.removeLayer(l);
    });
    tileLayer(settings.imagery).addTo(map);
  }
}

export function flyToChina() {
  if (!map) return;
  map.flyTo([34.0, 104.0], 4.6, { duration: 1.1 });
}

export function flyToPoint(lat: number, lng: number, zoom = 11) {
  if (!map) return;
  map.flyTo([lat, lng], zoom, { duration: 1.1 });
}

export function project(p: GeoPoint): { x: number; y: number } | null {
  if (!map) return null;
  const pt = map.latLngToContainerPoint([p.lat, p.lng]);
  const rect = map.getContainer().getBoundingClientRect();
  return { x: rect.left + pt.x, y: rect.top + pt.y };
}

export function makePoiIcon(color: string, selected = false): L.DivIcon {
  const size = selected ? 46 : 34;
  return L.divIcon({
    className: 'trav-pin',
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size * 1.09}" viewBox="0 0 44 48">
      <path d="M22 1C11 1 3 9.2 3 20.4 3 32 22 47 22 47S41 32 41 20.4C41 9.2 33 1 22 1z" fill="${color}" stroke="#0B0E13" stroke-width="1.6"/>
      <path d="M8 20l10-13 10 13z" fill="#0B0E13" opacity=".85"/><path d="M8 20l4-3 4 4 4-5 4 4z" fill="#fff" opacity=".9"/>
    </svg>`,
    iconSize: [size, size * 1.09],
    iconAnchor: [size / 2, size * 1.09],
  });
}

export function makeDayIcon(color: string, num: number): L.DivIcon {
  return L.divIcon({
    className: 'trav-pin trav-pin-day',
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="44" viewBox="0 0 44 48">
      <path d="M22 1C11 1 3 9.2 3 20.4 3 32 22 47 22 47S41 32 41 20.4C41 9.2 33 1 22 1z" fill="${color}" stroke="#fff" stroke-width="2.2"/>
      <circle cx="22" cy="20.5" r="12.5" fill="#10141c"/>
      <text x="22" y="25.5" font-family="'IBM Plex Mono',monospace" font-size="13" font-weight="700" fill="#fff" text-anchor="middle">${num}</text>
    </svg>`,
    iconSize: [40, 44],
    iconAnchor: [20, 44],
  });
}

export function makeLocateIcon(): L.DivIcon {
  return L.divIcon({
    className: 'trav-pin trav-locate-pin',
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="61" viewBox="0 0 44 48">
      <path d="M22 1C11 1 3 9.2 3 20.4 3 32 22 47 22 47S41 32 41 20.4C41 9.2 33 1 22 1z" fill="#E8A33D" stroke="#fff" stroke-width="2.4"/>
      <circle cx="22" cy="20.5" r="14" fill="#FFF3DC" opacity=".92"/>
      <circle cx="22" cy="20.5" r="8.5" fill="#E8A33D"/>
      <circle cx="22" cy="20.5" r="3.4" fill="#0B0E13"/>
    </svg>`,
    iconSize: [56, 61],
    iconAnchor: [28, 61],
  });
}
