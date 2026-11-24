use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct UpdateAttributeValueDto {
    #[serde(rename = "attributeId")]
    pub attribute_id: Option<i32>,
    #[serde(rename = "value")]
    pub value: Option<String>,
}
