use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct UpdateAttributeDefinitionDto {
    #[serde(rename = "name")]
    pub name: Option<String>,
    #[serde(rename = "code")]
    pub code: Option<String>,
}
