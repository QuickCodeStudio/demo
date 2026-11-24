use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::brand_repository::BrandRepository;
use anyhow::Result;
use serde_json::Value;

pub struct GetItemBrandQuery {
    pub id: serde_json::Value,
}

pub struct GetItemBrandHandler;

impl Handler<GetItemBrandQuery> for GetItemBrandHandler {
    type Output = Option<Value>;

    async fn handle(pool: &DbPool, query: GetItemBrandQuery) -> Result<Self::Output> {
        BrandRepository::get_by_pk(pool, query.id).await
    }
}
