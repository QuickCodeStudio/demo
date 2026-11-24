use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategoryDto {
    #[serde(rename = "id")]
    pub id: i32,
    #[serde(rename = "parentCategoryId")]
    pub parent_category_id: i32,
    #[serde(rename = "name")]
    pub name: String,
    #[serde(rename = "slug")]
    pub slug: String,
    #[serde(rename = "icon")]
    pub icon: String,
    #[serde(rename = "banner")]
    pub banner: String,
    #[serde(rename = "introVideo")]
    pub intro_video: String,
    #[serde(rename = "isActive")]
    pub is_active: bool,
    #[serde(rename = "IsDeleted", default)]
    pub is_deleted: bool,
    #[serde(rename = "DeletedOnUtc")]
    pub deleted_on_utc: Option<String>,
}
