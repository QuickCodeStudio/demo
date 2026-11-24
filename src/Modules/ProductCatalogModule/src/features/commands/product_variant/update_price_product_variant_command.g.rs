use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::product_variant_repository::ProductVariantRepository;
use anyhow::Result;
use serde_json::Value;

pub struct UpdatePriceProductVariantCommand {
    pub values: Vec<Value>,
}

pub struct UpdatePriceProductVariantHandler;

impl Handler<UpdatePriceProductVariantCommand> for UpdatePriceProductVariantHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, command: UpdatePriceProductVariantCommand) -> Result<Self::Output> {
        ProductVariantRepository::update_price(pool, command.values).await
    }
}
