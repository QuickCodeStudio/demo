use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::product_repository::ProductRepository;
use anyhow::Result;
use serde_json::Value;

pub struct GetCountByStatusProductQuery {
    pub values: Vec<Value>,
}

pub struct GetCountByStatusProductHandler;

impl Handler<GetCountByStatusProductQuery> for GetCountByStatusProductHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, query: GetCountByStatusProductQuery) -> Result<Self::Output> {
        ProductRepository::get_count_by_status(pool, query.values).await
    }
}
