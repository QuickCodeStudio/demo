use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::product_repository::ProductRepository;
use anyhow::Result;
use serde_json::Value;

pub struct SearchProductsProductQuery {
    pub values: Vec<Value>,
}

pub struct SearchProductsProductHandler;

impl Handler<SearchProductsProductQuery> for SearchProductsProductHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, query: SearchProductsProductQuery) -> Result<Self::Output> {
        ProductRepository::search_products(pool, query.values).await
    }
}
