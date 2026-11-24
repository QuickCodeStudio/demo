use serde::{Deserialize, Serialize};

/// RFC 7946 GeoJSON Point — coordinates are [longitude, latitude].
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct GeoJsonPoint {
    #[serde(default = "geo_point_type")]
    pub r#type: String,
    pub coordinates: [f64; 2],
}

fn geo_point_type() -> String {
    "Point".to_string()
}

/// Simple latitude/longitude DTO.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct GeoLatLng {
    pub latitude: f64,
    pub longitude: f64,
}