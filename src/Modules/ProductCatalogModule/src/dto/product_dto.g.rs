use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductDto {
    #[serde(rename = "id")]
    pub id: i32,
    #[serde(rename = "sellerId")]
    pub seller_id: i32,
    #[serde(rename = "brandId")]
    pub brand_id: i32,
    #[serde(rename = "primaryCategoryId")]
    pub primary_category_id: i32,
    #[serde(rename = "sku")]
    pub sku: String,
    #[serde(rename = "name")]
    pub name: String,
    #[serde(rename = "description")]
    pub description: String,
    #[serde(rename = "photo")]
    pub photo: String,
    #[serde(rename = "video")]
    pub video: String,
    #[serde(rename = "datasheet")]
    pub datasheet: String,
    #[serde(rename = "status")]
    pub status: String,
    #[serde(rename = "isFeatured")]
    pub is_featured: bool,
    #[serde(rename = "createdDate")]
    pub created_date: String,
    #[serde(rename = "IsDeleted", default)]
    pub is_deleted: bool,
    #[serde(rename = "DeletedOnUtc")]
    pub deleted_on_utc: Option<String>,
}
