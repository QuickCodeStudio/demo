use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Category {
    #[serde(rename = "ID")]
    pub id: i32,
    #[serde(rename = "PARENT_CATEGORY_ID")]
    pub parent_category_id: i32,
    #[serde(rename = "NAME")]
    pub name: String,
    #[serde(rename = "SLUG")]
    pub slug: String,
    #[serde(rename = "ICON")]
    pub icon: String,
    #[serde(rename = "BANNER")]
    pub banner: String,
    #[serde(rename = "INTRO_VIDEO")]
    pub intro_video: String,
    #[serde(rename = "IS_ACTIVE")]
    pub is_active: bool,
    #[serde(rename = "IsDeleted", default)]
    pub is_deleted: bool,
    #[serde(rename = "DeletedOnUtc")]
    pub deleted_on_utc: Option<String>,
}
