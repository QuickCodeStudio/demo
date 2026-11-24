use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub enum ProductStatus {
    Draft,
    PendingApproval,
    Active,
    Inactive,
    Discontinued,
}
