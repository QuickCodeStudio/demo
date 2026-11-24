use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ProductGetProductsWithDetailsFilterDto {
    #[serde(default)]
    pub products_primary_category_id: Option<String>,
    #[serde(default)]
    pub category_id: Option<String>,
    #[serde(default)]
    pub product_brand_id: Option<String>,
    #[serde(default)]
    pub brand_id: Option<String>,
    #[serde(default = "default_page")]
    pub page_number: i64,
    #[serde(default = "default_size", rename = "pageSize")]
    pub page_size: i64,
}
fn default_page() -> i64 { 1 }
fn default_size() -> i64 { 20 }
