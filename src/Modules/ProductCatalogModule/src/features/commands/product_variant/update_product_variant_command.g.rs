use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::product_variant_repository::ProductVariantRepository;
use anyhow::Result;
use serde_json::Value;
use std::collections::HashMap;

pub struct UpdateProductVariantCommand {
    pub id: serde_json::Value,
    pub body: HashMap<String, Value>,
}

pub struct UpdateProductVariantHandler;

impl Handler<UpdateProductVariantCommand> for UpdateProductVariantHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, command: UpdateProductVariantCommand) -> Result<Self::Output> {
        ProductVariantRepository::update(pool, command.id, command.body).await
    }
}
