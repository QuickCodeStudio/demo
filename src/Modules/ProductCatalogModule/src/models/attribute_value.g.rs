use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AttributeValue {
    #[serde(rename = "ID")]
    pub id: i32,
    #[serde(rename = "ATTRIBUTE_ID")]
    pub attribute_id: i32,
    #[serde(rename = "VALUE")]
    pub value: String,
    #[serde(rename = "IsDeleted", default)]
    pub is_deleted: bool,
    #[serde(rename = "DeletedOnUtc")]
    pub deleted_on_utc: Option<String>,
}
