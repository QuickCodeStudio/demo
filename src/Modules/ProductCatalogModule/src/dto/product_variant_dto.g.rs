use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductVariantDto {
    #[serde(rename = "id")]
    pub id: i32,
    #[serde(rename = "productId")]
    pub product_id: i32,
    #[serde(rename = "sku")]
    pub sku: String,
    #[serde(rename = "price")]
    pub price: f64,
    #[serde(rename = "stockQuantity")]
    pub stock_quantity: i32,
    #[serde(rename = "isActive")]
    pub is_active: bool,
    #[serde(rename = "IsDeleted", default)]
    pub is_deleted: bool,
    #[serde(rename = "DeletedOnUtc")]
    pub deleted_on_utc: Option<String>,
}
