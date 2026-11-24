use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::product_variant_attribute_repository::ProductVariantAttributeRepository;
use anyhow::Result;
use serde_json::Value;
use std::collections::HashMap;

pub struct InsertProductVariantAttributeCommand {
    pub body: HashMap<String, Value>,
}

pub struct InsertProductVariantAttributeHandler;

impl Handler<InsertProductVariantAttributeCommand> for InsertProductVariantAttributeHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, command: InsertProductVariantAttributeCommand) -> Result<Self::Output> {
        ProductVariantAttributeRepository::insert(pool, command.body).await
    }
}
