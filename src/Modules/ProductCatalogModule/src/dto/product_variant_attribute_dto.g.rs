use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductVariantAttributeDto {
    #[serde(rename = "variantId")]
    pub variant_id: i32,
    #[serde(rename = "attributeValueId")]
    pub attribute_value_id: i32,
}
