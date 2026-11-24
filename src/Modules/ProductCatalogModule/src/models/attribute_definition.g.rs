use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AttributeDefinition {
    #[serde(rename = "ID")]
    pub id: i32,
    #[serde(rename = "NAME")]
    pub name: String,
    #[serde(rename = "CODE")]
    pub code: String,
    #[serde(rename = "IsDeleted", default)]
    pub is_deleted: bool,
    #[serde(rename = "DeletedOnUtc")]
    pub deleted_on_utc: Option<String>,
}
