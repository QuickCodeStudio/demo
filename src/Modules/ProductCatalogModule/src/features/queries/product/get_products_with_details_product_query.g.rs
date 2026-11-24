use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::product_repository::ProductRepository;
use anyhow::Result;
use serde_json::Value;

pub struct GetProductsWithDetailsProductQuery {
    pub values: Vec<Value>,
}

pub struct GetProductsWithDetailsProductHandler;

impl Handler<GetProductsWithDetailsProductQuery> for GetProductsWithDetailsProductHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, query: GetProductsWithDetailsProductQuery) -> Result<Self::Output> {
        ProductRepository::get_products_with_details(pool, query.values).await
    }
}
