use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductCategory {
    #[serde(rename = "PRODUCT_ID")]
    pub product_id: i32,
    #[serde(rename = "CATEGORY_ID")]
    pub category_id: i32,
}
