use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::product_variant_attribute_repository::ProductVariantAttributeRepository;
use anyhow::Result;
use serde_json::Value;
use std::collections::HashMap;

pub struct UpdateProductVariantAttributeCommand {
    pub variant_id: serde_json::Value,
    pub attribute_value_id: serde_json::Value,
    pub body: HashMap<String, Value>,
}

pub struct UpdateProductVariantAttributeHandler;

impl Handler<UpdateProductVariantAttributeCommand> for UpdateProductVariantAttributeHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, command: UpdateProductVariantAttributeCommand) -> Result<Self::Output> {
        ProductVariantAttributeRepository::update(pool, command.variant_id, command.attribute_value_id, command.body).await
    }
}
