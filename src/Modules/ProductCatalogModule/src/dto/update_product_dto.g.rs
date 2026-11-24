use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct UpdateProductDto {
    #[serde(rename = "sellerId")]
    pub seller_id: Option<i32>,
    #[serde(rename = "brandId")]
    pub brand_id: Option<i32>,
    #[serde(rename = "primaryCategoryId")]
    pub primary_category_id: Option<i32>,
    #[serde(rename = "sku")]
    pub sku: Option<String>,
    #[serde(rename = "name")]
    pub name: Option<String>,
    #[serde(rename = "description")]
    pub description: Option<String>,
    #[serde(rename = "photo")]
    pub photo: Option<String>,
    #[serde(rename = "video")]
    pub video: Option<String>,
    #[serde(rename = "datasheet")]
    pub datasheet: Option<String>,
    #[serde(rename = "status")]
    pub status: Option<String>,
    #[serde(rename = "isFeatured")]
    pub is_featured: Option<bool>,
    #[serde(rename = "createdDate")]
    pub created_date: Option<String>,
}
