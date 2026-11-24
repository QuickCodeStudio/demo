use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductVariant {
    #[serde(rename = "ID")]
    pub id: i32,
    #[serde(rename = "PRODUCT_ID")]
    pub product_id: i32,
    #[serde(rename = "SKU")]
    pub sku: String,
    #[serde(rename = "PRICE")]
    pub price: f64,
    #[serde(rename = "STOCK_QUANTITY")]
    pub stock_quantity: i32,
    #[serde(rename = "IS_ACTIVE")]
    pub is_active: bool,
    #[serde(rename = "IsDeleted", default)]
    pub is_deleted: bool,
    #[serde(rename = "DeletedOnUtc")]
    pub deleted_on_utc: Option<String>,
}
