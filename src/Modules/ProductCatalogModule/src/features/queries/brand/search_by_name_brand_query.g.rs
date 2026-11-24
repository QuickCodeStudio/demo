use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::brand_repository::BrandRepository;
use anyhow::Result;
use serde_json::Value;

pub struct SearchByNameBrandQuery {
    pub values: Vec<Value>,
}

pub struct SearchByNameBrandHandler;

impl Handler<SearchByNameBrandQuery> for SearchByNameBrandHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, query: SearchByNameBrandQuery) -> Result<Self::Output> {
        BrandRepository::search_by_name(pool, query.values).await
    }
}
