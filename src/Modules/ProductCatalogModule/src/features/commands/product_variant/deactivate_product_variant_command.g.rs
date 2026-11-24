use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::product_variant_repository::ProductVariantRepository;
use anyhow::Result;
use serde_json::Value;

pub struct DeactivateProductVariantCommand {
    pub values: Vec<Value>,
}

pub struct DeactivateProductVariantHandler;

impl Handler<DeactivateProductVariantCommand> for DeactivateProductVariantHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, command: DeactivateProductVariantCommand) -> Result<Self::Output> {
        ProductVariantRepository::deactivate(pool, command.values).await
    }
}
