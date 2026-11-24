use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductCategoryDto {
    #[serde(rename = "productId")]
    pub product_id: i32,
    #[serde(rename = "categoryId")]
    pub category_id: i32,
}
