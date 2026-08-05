import * as Cesium from 'cesium';
import type { AppSettings } from './types';
import type { GeoPoint } from './types';

let viewer: Cesium.Viewer | null = null;
let initPromise: Promise<Cesium.Viewer> | null = null;

export function getViewer(): Cesium.Viewer | null {
  return viewer;
}

export function destroyViewer() {
  initPromise = null;
  if (viewer) {
    viewer.destroy();
    viewer = null;
  }
}

function makeImagery(imagery: AppSettings['imagery']) {
  if (imagery === 'osm') {
    return new Cesium.UrlTemplateImageryProvider({
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      credit: '© OpenStreetMap',
      maximumLevel: 19,
    });
  }
  if (imagery === 'carto') {
    return new Cesium.UrlTemplateImageryProvider({
      url: 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
      credit: '© CARTO © OpenStreetMap',
      maximumLevel: 20,
    });
  }
  return Cesium.createWorldImageryAsync({
    style: Cesium.IonWorldImageryStyle.AERIAL,
  });
}

function makeTerrain(settings: AppSettings): Cesium.TerrainProvider | Promise<Cesium.TerrainProvider> {
  if (settings.terrain === 'flat' || settings.terrain === 'ion') {
    if (settings.terrain === 'ion') {
      if (!settings.ionToken) return new Cesium.EllipsoidTerrainProvider();
      return Cesium.createWorldTerrainAsync({ requestVertexNormals: true });
    }
    return new Cesium.EllipsoidTerrainProvider();
  }
  return Cesium.ArcGISTiledElevationTerrainProvider.fromUrl(
    'https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer',
  );
}export function initViewer(
  container: HTMLElement,
  settings: AppSettings,
): Promise<Cesium.Viewer> {
  if (viewer) return Promise.resolve(viewer);
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      const imagery = await makeImagery(settings.imagery);
      let terrain: Cesium.TerrainProvider = new Cesium.EllipsoidTerrainProvider();
      try {
        terrain = await makeTerrain(settings);
      } catch {
        terrain = new Cesium.EllipsoidTerrainProvider();
      }
      if (viewer) return viewer;
      const v = new Cesium.Viewer(container, {
        baseLayer: Cesium.ImageryLayer.fromProviderAsync(Promise.resolve(imagery)),
        terrainProvider: terrain,
        baseLayerPicker: false,
        geocoder: false,
        homeButton: false,
        sceneModePicker: false,
        navigationHelpButton: false,
        animation: false,
        timeline: false,
        fullscreenButton: false,
        infoBox: false,
        selectionIndicator: false,
        creditContainer: document.createElement('div'),
        msaaSamples: 4,
        contextOptions: {
          webgl: { antialias: true, alpha: true },
        },
      });
      const scene = v.scene;
      scene.globe.enableLighting = false;
      scene.globe.baseColor = Cesium.Color.fromCssColorString('#0B0E13');
      scene.globe.depthTestAgainstTerrain = false;
      scene.screenSpaceCameraController.minimumZoomDistance = 800;
      scene.screenSpaceCameraController.maximumZoomDistance = 90000000;
      scene.screenSpaceCameraController.translateEventTypes = [Cesium.CameraEventType.LEFT_DRAG];
      scene.screenSpaceCameraController.rotateEventTypes = [Cesium.CameraEventType.RIGHT_DRAG];
      scene.screenSpaceCameraController.tiltEventTypes = [Cesium.CameraEventType.PINCH];
      scene.screenSpaceCameraController.lookEventTypes = [Cesium.CameraEventType.LEFT_DRAG, Cesium.CameraEventType.PINCH];
      scene.fog.enabled = true;
      scene.fog.density = 0.00018;
      scene.moon = undefined as never;
      scene.skyBox = undefined as never;
      (v.scene as unknown as { postProcessStages: { bloom: { enabled: boolean } } }).postProcessStages.bloom.enabled =
        false;

      viewer = v;
      flyToChina();
      (window as unknown as Record<string, unknown>).__viewer = viewer;
      (window as unknown as Record<string, unknown>).__Cesium = Cesium;
      return viewer;
    } catch (e) {
      initPromise = null;
      throw e;
    }
  })();
  return initPromise;
}

export function applySettings(viewer: Cesium.Viewer, settings: AppSettings, prev?: AppSettings) {
  if (prev && prev.imagery !== settings.imagery) {
    Promise.resolve(makeImagery(settings.imagery)).then((p) => {
      viewer.imageryLayers.removeAll();
      viewer.imageryLayers.addImageryProvider(p);
    });
  }
  if (prev && prev.terrain !== settings.terrain) {
    Promise.resolve(makeTerrain(settings)).then((t) => {
      viewer.terrainProvider = t;
      viewer.scene.requestRender();
    });
  }
}

export function flyToChina() {
  const v = getViewer();
  if (!v) return;
  v.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(104.0, 35.0, 6800000),
    orientation: { heading: 0, pitch: -Cesium.Math.PI_OVER_TWO + 0.35, roll: 0 },
    duration: 1.4,
  });
}

export function flyToPoint(lat: number, lng: number, height = 40000, pitchRad = 0.45) {
  const v = getViewer();
  if (!v) return;
  v.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(lng, lat, height),
    orientation: { heading: 0, pitch: -Cesium.Math.PI_OVER_TWO + pitchRad, roll: 0 },
    duration: 1.2,
  });
}

export function setPitch(degrees: number) {
  const v = getViewer();
  if (!v) return;
  const target = Cesium.Math.toRadians(degrees);
  const cam = v.camera;
  cam.setView({
    orientation: {
      heading: cam.heading,
      pitch: -Cesium.Math.PI_OVER_TWO + target,
      roll: 0,
    },
  });
}

export interface TerrainSample {
  lat: number;
  lng: number;
  height: number;
}

/** Sample terrain heights for a list of lon/lat points. */
export async function sampleHeights(pts: GeoPoint[]): Promise<TerrainSample[]> {
  const v = getViewer();
  if (!v) return pts.map((p) => ({ ...p, height: 0 }));
  const zero = pts.map((p) => ({ ...p, height: 0 }));
  const cartographics = pts.map((p) => Cesium.Cartographic.fromDegrees(p.lng, p.lat));
  try {
    if ((Cesium.sampleTerrainMostDetailed as unknown) !== undefined) {
      try {
        const sampled = await (Cesium.sampleTerrainMostDetailed as (
          t: Cesium.TerrainProvider,
          p: Cesium.Cartographic[],
        ) => Promise<Cesium.Cartographic[]>)(v.terrainProvider, cartographics);
        return pts.map((p, i) => ({ ...p, height: sampled[i]?.height || 0 }));
      } catch {
        // provider without availability → fall through to plain sampling
      }
    }
    const level = v.camera.positionCartographic.height < 200000 ? 12 : 10;
    const sampled = await (Cesium.sampleTerrain as (
      t: Cesium.TerrainProvider,
      l: number,
      p: Cesium.Cartographic[],
    ) => Promise<Cesium.Cartographic[]>)(v.terrainProvider, level, cartographics);
    return pts.map((p, i) => ({ ...p, height: sampled[i]?.height || 0 }));
  } catch {
    return zero;
  }
}

/** Build heighted positions from a route geometry (terrain-draped, +6m). */
export async function drapeRoute(pts: GeoPoint[]): Promise<Cesium.Cartesian3[]> {
  if (pts.length < 2) return [];
  const samples = await sampleHeights(pts);
  return samples.map((s) => Cesium.Cartesian3.fromDegrees(s.lng, s.lat, s.height + 6));
}

export function makePinSvg(
  kind: 'scenic' | 'airport' | 'station',
  color: string,
  selected = false,
): string {
  const size = selected ? 64 : 48;
  const glyph =
    kind === 'scenic'
      ? '<path d="M8 20l10-13 10 13z" fill="#0B0E13" opacity=".85"/><path d="M8 20l4-3 4 4 4-5 4 4z" fill="#fff" opacity=".9"/>'
      : kind === 'airport'
        ? '<path d="M28 13l-16 5 4 4-5 6 3 2 5-4 4 4z" fill="#fff"/><path d="M16 18l11-3-4-4 5-6-3-2-5 4z" fill="#0B0E13" opacity=".5"/>'
        : '<rect x="11" y="13" width="22" height="16" rx="3" fill="#fff"/><rect x="14" y="16" width="8" height="4" rx="1" fill="#0B0E13" opacity=".45"/><circle cx="17" cy="26" r="2.2" fill="#0B0E13"/><circle cx="27" cy="26" r="2.2" fill="#0B0E13"/><rect x="24" y="16" width="6" height="4" rx="1" fill="#0B0E13" opacity=".45"/>';
  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 44 48">
      <path d="M22 1C11 1 3 9.2 3 20.4 3 32 22 47 22 47S41 32 41 20.4C41 9.2 33 1 22 1z" fill="${color}" stroke="#0B0E13" stroke-width="1.6"/>
      <circle cx="22" cy="20.5" r="9.5" fill="#0B0E13" opacity=".15"/>
      ${glyph}
    </svg>`,
  )}`;
}

export function poiToCartesian(p: GeoPoint): Cesium.Cartesian3 {
  return Cesium.Cartesian3.fromDegrees(p.lng, p.lat);
}

export function screenPosition(lat: number, lng: number): Cesium.Cartesian2 | null {
  const v = getViewer();
  if (!v) return null;
  const scene = v.scene;
  const pos = scene.cartesianToCanvasCoordinates(poiToCartesian({ lat, lng }));
  if (pos) return pos;
  const cart = Cesium.Cartographic.fromDegrees(lng, lat);
  const height = scene.globe.getHeight(cart) || 0;
  const clamp = Cesium.Cartesian3.fromDegrees(lng, lat, height + 100);
  return scene.cartesianToCanvasCoordinates(clamp) ?? null;
}

export { Cesium };
