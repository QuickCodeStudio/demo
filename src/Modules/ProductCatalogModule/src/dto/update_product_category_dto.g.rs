use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct UpdateProductCategoryDto {
    #[serde(rename = "productId")]
    pub product_id: Option<i32>,
    #[serde(rename = "categoryId")]
    pub category_id: Option<i32>,
}
