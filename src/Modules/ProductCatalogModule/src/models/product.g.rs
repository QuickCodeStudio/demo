use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Product {
    #[serde(rename = "ID")]
    pub id: i32,
    #[serde(rename = "SELLER_ID")]
    pub seller_id: i32,
    #[serde(rename = "BRAND_ID")]
    pub brand_id: i32,
    #[serde(rename = "PRIMARY_CATEGORY_ID")]
    pub primary_category_id: i32,
    #[serde(rename = "SKU")]
    pub sku: String,
    #[serde(rename = "NAME")]
    pub name: String,
    #[serde(rename = "DESCRIPTION")]
    pub description: String,
    #[serde(rename = "PHOTO")]
    pub photo: String,
    #[serde(rename = "VIDEO")]
    pub video: String,
    #[serde(rename = "DATASHEET")]
    pub datasheet: String,
    #[serde(rename = "STATUS")]
    pub status: String,
    #[serde(rename = "IS_FEATURED")]
    pub is_featured: bool,
    #[serde(rename = "CREATED_DATE")]
    pub created_date: String,
    #[serde(rename = "IsDeleted", default)]
    pub is_deleted: bool,
    #[serde(rename = "DeletedOnUtc")]
    pub deleted_on_utc: Option<String>,
}
