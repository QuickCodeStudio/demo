use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::product_variant_attribute_repository::ProductVariantAttributeRepository;
use anyhow::Result;

pub struct DeleteItemProductVariantAttributeCommand {
    pub variant_id: serde_json::Value,
    pub attribute_value_id: serde_json::Value,
}

pub struct DeleteItemProductVariantAttributeHandler;

impl Handler<DeleteItemProductVariantAttributeCommand> for DeleteItemProductVariantAttributeHandler {
    type Output = Vec<serde_json::Value>;

    async fn handle(pool: &DbPool, command: DeleteItemProductVariantAttributeCommand) -> Result<Self::Output> {
        ProductVariantAttributeRepository::delete(pool, command.variant_id, command.attribute_value_id).await
    }
}
