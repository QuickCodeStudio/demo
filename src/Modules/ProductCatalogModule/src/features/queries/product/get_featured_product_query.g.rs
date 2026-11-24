use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::product_repository::ProductRepository;
use anyhow::Result;
use serde_json::Value;

pub struct GetFeaturedProductQuery {
    pub values: Vec<Value>,
}

pub struct GetFeaturedProductHandler;

impl Handler<GetFeaturedProductQuery> for GetFeaturedProductHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, query: GetFeaturedProductQuery) -> Result<Self::Output> {
        ProductRepository::get_featured(pool, query.values).await
    }
}
