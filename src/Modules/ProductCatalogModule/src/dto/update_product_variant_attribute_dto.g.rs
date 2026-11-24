use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct UpdateProductVariantAttributeDto {
    #[serde(rename = "variantId")]
    pub variant_id: Option<i32>,
    #[serde(rename = "attributeValueId")]
    pub attribute_value_id: Option<i32>,
}
