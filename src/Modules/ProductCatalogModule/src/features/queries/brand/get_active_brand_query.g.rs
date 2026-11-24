use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::brand_repository::BrandRepository;
use anyhow::Result;
use serde_json::Value;

pub struct GetActiveBrandQuery {
    pub values: Vec<Value>,
}

pub struct GetActiveBrandHandler;

impl Handler<GetActiveBrandQuery> for GetActiveBrandHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, query: GetActiveBrandQuery) -> Result<Self::Output> {
        BrandRepository::get_active(pool, query.values).await
    }
}
