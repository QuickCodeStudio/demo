use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct UpdateProductVariantDto {
    #[serde(rename = "productId")]
    pub product_id: Option<i32>,
    #[serde(rename = "sku")]
    pub sku: Option<String>,
    #[serde(rename = "price")]
    pub price: Option<f64>,
    #[serde(rename = "stockQuantity")]
    pub stock_quantity: Option<i32>,
    #[serde(rename = "isActive")]
    pub is_active: Option<bool>,
}
