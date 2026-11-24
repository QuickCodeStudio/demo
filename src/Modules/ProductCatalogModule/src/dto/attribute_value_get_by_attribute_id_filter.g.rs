use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AttributeValueGetByAttributeIdFilterDto {
    #[serde(default)]
    pub attribute_value_attribute_id: Option<String>,
    #[serde(default = "default_page")]
    pub page_number: i64,
    #[serde(default = "default_size", rename = "pageSize")]
    pub page_size: i64,
}
fn default_page() -> i64 { 1 }
fn default_size() -> i64 { 20 }
