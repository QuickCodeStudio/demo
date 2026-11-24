use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AttributeValueDto {
    #[serde(rename = "id")]
    pub id: i32,
    #[serde(rename = "attributeId")]
    pub attribute_id: i32,
    #[serde(rename = "value")]
    pub value: String,
    #[serde(rename = "IsDeleted", default)]
    pub is_deleted: bool,
    #[serde(rename = "DeletedOnUtc")]
    pub deleted_on_utc: Option<String>,
}
