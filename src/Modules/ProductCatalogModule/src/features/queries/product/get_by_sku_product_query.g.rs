use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::product_repository::ProductRepository;
use anyhow::Result;
use serde_json::Value;

pub struct GetBySkuProductQuery {
    pub values: Vec<Value>,
}

pub struct GetBySkuProductHandler;

impl Handler<GetBySkuProductQuery> for GetBySkuProductHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, query: GetBySkuProductQuery) -> Result<Self::Output> {
        ProductRepository::get_by_sku(pool, query.values).await
    }
}
