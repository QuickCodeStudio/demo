use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct UpdateCategoryDto {
    #[serde(rename = "parentCategoryId")]
    pub parent_category_id: Option<i32>,
    #[serde(rename = "name")]
    pub name: Option<String>,
    #[serde(rename = "slug")]
    pub slug: Option<String>,
    #[serde(rename = "icon")]
    pub icon: Option<String>,
    #[serde(rename = "banner")]
    pub banner: Option<String>,
    #[serde(rename = "introVideo")]
    pub intro_video: Option<String>,
    #[serde(rename = "isActive")]
    pub is_active: Option<bool>,
}
