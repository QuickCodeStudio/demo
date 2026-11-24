/** RFC 7946 GeoJSON Point — coordinates are [longitude, latitude]. */
export class GeoJsonPoint {
  type: 'Point' = 'Point';
  coordinates: [number, number] = [0, 0];
}

/** Simple latitude/longitude DTO. */
export class GeoLatLng {
  latitude = 0;
  longitude = 0;
}

const POINT_RE = /^POINT\s*\(\s*([+-]?\d*\.?\d+)\s+([+-]?\d*\.?\d+)\s*\)$/i;

export function parseWktToLonLat(wkt: unknown): { lon: number; lat: number } | null {
  if (wkt == null || typeof wkt !== 'string') return null;
  const m = POINT_RE.exec(wkt.trim());
  if (!m) return null;
  return { lon: Number(m[1]), lat: Number(m[2]) };
}

export function geoJsonPointFromWkt(wkt: unknown): GeoJsonPoint | null {
  const p = parseWktToLonLat(wkt);
  if (!p) return null;
  const g = new GeoJsonPoint();
  g.coordinates = [p.lon, p.lat];
  return g;
}

export function geoLatLngFromWkt(wkt: unknown): GeoLatLng | null {
  const p = parseWktToLonLat(wkt);
  if (!p) return null;
  const g = new GeoLatLng();
  g.longitude = p.lon;
  g.latitude = p.lat;
  return g;
}

export function geoToWkt(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  const v = value as Record<string, unknown>;
  if (Array.isArray(v.coordinates) && v.coordinates.length >= 2) {
    return `POINT(${Number(v.coordinates[0])} ${Number(v.coordinates[1])})`;
  }
  if (typeof v.longitude === 'number' && typeof v.latitude === 'number') {
    return `POINT(${v.longitude} ${v.latitude})`;
  }
  return null;
}
