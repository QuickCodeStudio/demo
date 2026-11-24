use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::category_repository::CategoryRepository;
use anyhow::Result;
use serde_json::Value;

pub struct GetActiveCategoryQuery {
    pub values: Vec<Value>,
}

pub struct GetActiveCategoryHandler;

impl Handler<GetActiveCategoryQuery> for GetActiveCategoryHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, query: GetActiveCategoryQuery) -> Result<Self::Output> {
        CategoryRepository::get_active(pool, query.values).await
    }
}
