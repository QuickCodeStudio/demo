use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::brand_repository::BrandRepository;
use anyhow::Result;
use serde_json::Value;

pub struct DeactivateBrandCommand {
    pub values: Vec<Value>,
}

pub struct DeactivateBrandHandler;

impl Handler<DeactivateBrandCommand> for DeactivateBrandHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, command: DeactivateBrandCommand) -> Result<Self::Output> {
        BrandRepository::deactivate(pool, command.values).await
    }
}
