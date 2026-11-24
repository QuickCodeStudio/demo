use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct UpdateBrandDto {
    #[serde(rename = "name")]
    pub name: Option<String>,
    #[serde(rename = "logo")]
    pub logo: Option<String>,
    #[serde(rename = "photo")]
    pub photo: Option<String>,
    #[serde(rename = "brandVideo")]
    pub brand_video: Option<String>,
    #[serde(rename = "catalogPdf")]
    pub catalog_pdf: Option<String>,
    #[serde(rename = "isActive")]
    pub is_active: Option<bool>,
}
