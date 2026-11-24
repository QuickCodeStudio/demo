use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::product_variant_attribute_repository::ProductVariantAttributeRepository;
use anyhow::Result;
use serde_json::Value;

pub struct RemoveAttributeProductVariantAttributeCommand {
    pub values: Vec<Value>,
}

pub struct RemoveAttributeProductVariantAttributeHandler;

impl Handler<RemoveAttributeProductVariantAttributeCommand> for RemoveAttributeProductVariantAttributeHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, command: RemoveAttributeProductVariantAttributeCommand) -> Result<Self::Output> {
        ProductVariantAttributeRepository::remove_attribute(pool, command.values).await
    }
}
