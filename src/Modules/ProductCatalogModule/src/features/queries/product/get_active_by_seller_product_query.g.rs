use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::product_repository::ProductRepository;
use anyhow::Result;
use serde_json::Value;

pub struct GetActiveBySellerProductQuery {
    pub values: Vec<Value>,
}

pub struct GetActiveBySellerProductHandler;

impl Handler<GetActiveBySellerProductQuery> for GetActiveBySellerProductHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, query: GetActiveBySellerProductQuery) -> Result<Self::Output> {
        ProductRepository::get_active_by_seller(pool, query.values).await
    }
}
