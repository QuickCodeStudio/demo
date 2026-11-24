use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Brand {
    #[serde(rename = "ID")]
    pub id: i32,
    #[serde(rename = "NAME")]
    pub name: String,
    #[serde(rename = "LOGO")]
    pub logo: String,
    #[serde(rename = "PHOTO")]
    pub photo: String,
    #[serde(rename = "BRAND_VIDEO")]
    pub brand_video: String,
    #[serde(rename = "CATALOG_PDF")]
    pub catalog_pdf: String,
    #[serde(rename = "IS_ACTIVE")]
    pub is_active: bool,
    #[serde(rename = "IsDeleted", default)]
    pub is_deleted: bool,
    #[serde(rename = "DeletedOnUtc")]
    pub deleted_on_utc: Option<String>,
}
