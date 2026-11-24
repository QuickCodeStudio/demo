use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::product_repository::ProductRepository;
use anyhow::Result;
use serde_json::Value;

pub struct GetItemProductQuery {
    pub id: serde_json::Value,
}

pub struct GetItemProductHandler;

impl Handler<GetItemProductQuery> for GetItemProductHandler {
    type Output = Option<Value>;

    async fn handle(pool: &DbPool, query: GetItemProductQuery) -> Result<Self::Output> {
        ProductRepository::get_by_pk(pool, query.id).await
    }
}
