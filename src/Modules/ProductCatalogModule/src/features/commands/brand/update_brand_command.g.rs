use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::brand_repository::BrandRepository;
use anyhow::Result;
use serde_json::Value;
use std::collections::HashMap;

pub struct UpdateBrandCommand {
    pub id: serde_json::Value,
    pub body: HashMap<String, Value>,
}

pub struct UpdateBrandHandler;

impl Handler<UpdateBrandCommand> for UpdateBrandHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, command: UpdateBrandCommand) -> Result<Self::Output> {
        BrandRepository::update(pool, command.id, command.body).await
    }
}
