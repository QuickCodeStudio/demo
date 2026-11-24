use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::product_repository::ProductRepository;
use anyhow::Result;
use serde_json::Value;

pub struct ApproveProductCommand {
    pub values: Vec<Value>,
}

pub struct ApproveProductHandler;

impl Handler<ApproveProductCommand> for ApproveProductHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, command: ApproveProductCommand) -> Result<Self::Output> {
        ProductRepository::approve(pool, command.values).await
    }
}
