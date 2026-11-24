"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeoLatLng = exports.GeoJsonPoint = void 0;
exports.parseWktToLonLat = parseWktToLonLat;
exports.geoJsonPointFromWkt = geoJsonPointFromWkt;
exports.geoLatLngFromWkt = geoLatLngFromWkt;
exports.geoToWkt = geoToWkt;
class GeoJsonPoint {
    type = 'Point';
    coordinates = [0, 0];
}
exports.GeoJsonPoint = GeoJsonPoint;
class GeoLatLng {
    latitude = 0;
    longitude = 0;
}
exports.GeoLatLng = GeoLatLng;
const POINT_RE = /^POINT\s*\(\s*([+-]?\d*\.?\d+)\s+([+-]?\d*\.?\d+)\s*\)$/i;
function parseWktToLonLat(wkt) {
    if (wkt == null || typeof wkt !== 'string')
        return null;
    const m = POINT_RE.exec(wkt.trim());
    if (!m)
        return null;
    return { lon: Number(m[1]), lat: Number(m[2]) };
}
function geoJsonPointFromWkt(wkt) {
    const p = parseWktToLonLat(wkt);
    if (!p)
        return null;
    const g = new GeoJsonPoint();
    g.coordinates = [p.lon, p.lat];
    return g;
}
function geoLatLngFromWkt(wkt) {
    const p = parseWktToLonLat(wkt);
    if (!p)
        return null;
    const g = new GeoLatLng();
    g.longitude = p.lon;
    g.latitude = p.lat;
    return g;
}
function geoToWkt(value) {
    if (value == null)
        return null;
    if (typeof value === 'string')
        return value;
    const v = value;
    if (Array.isArray(v.coordinates) && v.coordinates.length >= 2) {
        return `POINT(${Number(v.coordinates[0])} ${Number(v.coordinates[1])})`;
    }
    if (typeof v.longitude === 'number' && typeof v.latitude === 'number') {
        return `POINT(${v.longitude} ${v.latitude})`;
    }
    return null;
}
//# sourceMappingURL=geo.js.map