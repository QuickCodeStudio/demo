use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::product_variant_repository::ProductVariantRepository;
use anyhow::Result;
use serde_json::Value;

pub struct UpdateStockProductVariantCommand {
    pub values: Vec<Value>,
}

pub struct UpdateStockProductVariantHandler;

impl Handler<UpdateStockProductVariantCommand> for UpdateStockProductVariantHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, command: UpdateStockProductVariantCommand) -> Result<Self::Output> {
        ProductVariantRepository::update_stock(pool, command.values).await
    }
}
