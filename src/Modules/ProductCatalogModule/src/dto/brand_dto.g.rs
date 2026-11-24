use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrandDto {
    #[serde(rename = "id")]
    pub id: i32,
    #[serde(rename = "name")]
    pub name: String,
    #[serde(rename = "logo")]
    pub logo: String,
    #[serde(rename = "photo")]
    pub photo: String,
    #[serde(rename = "brandVideo")]
    pub brand_video: String,
    #[serde(rename = "catalogPdf")]
    pub catalog_pdf: String,
    #[serde(rename = "isActive")]
    pub is_active: bool,
    #[serde(rename = "IsDeleted", default)]
    pub is_deleted: bool,
    #[serde(rename = "DeletedOnUtc")]
    pub deleted_on_utc: Option<String>,
}
