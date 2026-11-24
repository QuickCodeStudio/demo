use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProductVariantAttribute {
    #[serde(rename = "VARIANT_ID")]
    pub variant_id: i32,
    #[serde(rename = "ATTRIBUTE_VALUE_ID")]
    pub attribute_value_id: i32,
}
