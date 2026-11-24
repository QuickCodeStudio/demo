use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::product_repository::ProductRepository;
use anyhow::Result;
use serde_json::Value;

pub struct RejectProductCommand {
    pub values: Vec<Value>,
}

pub struct RejectProductHandler;

impl Handler<RejectProductCommand> for RejectProductHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, command: RejectProductCommand) -> Result<Self::Output> {
        ProductRepository::reject(pool, command.values).await
    }
}
