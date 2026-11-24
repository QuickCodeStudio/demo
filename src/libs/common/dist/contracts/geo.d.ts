export declare class GeoJsonPoint {
    type: 'Point';
    coordinates: [number, number];
}
export declare class GeoLatLng {
    latitude: number;
    longitude: number;
}
export declare function parseWktToLonLat(wkt: unknown): {
    lon: number;
    lat: number;
} | null;
export declare function geoJsonPointFromWkt(wkt: unknown): GeoJsonPoint | null;
export declare function geoLatLngFromWkt(wkt: unknown): GeoLatLng | null;
export declare function geoToWkt(value: unknown): string | null;
