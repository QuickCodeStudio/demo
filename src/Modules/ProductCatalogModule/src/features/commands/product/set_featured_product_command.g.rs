use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::product_repository::ProductRepository;
use anyhow::Result;
use serde_json::Value;

pub struct SetFeaturedProductCommand {
    pub values: Vec<Value>,
}

pub struct SetFeaturedProductHandler;

impl Handler<SetFeaturedProductCommand> for SetFeaturedProductHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, command: SetFeaturedProductCommand) -> Result<Self::Output> {
        ProductRepository::set_featured(pool, command.values).await
    }
}
