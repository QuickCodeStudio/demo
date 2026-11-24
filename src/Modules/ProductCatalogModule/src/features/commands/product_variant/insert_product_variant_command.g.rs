use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::product_variant_repository::ProductVariantRepository;
use anyhow::Result;
use serde_json::Value;
use std::collections::HashMap;

pub struct InsertProductVariantCommand {
    pub body: HashMap<String, Value>,
}

pub struct InsertProductVariantHandler;

impl Handler<InsertProductVariantCommand> for InsertProductVariantHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, command: InsertProductVariantCommand) -> Result<Self::Output> {
        ProductVariantRepository::insert(pool, command.body).await
    }
}
