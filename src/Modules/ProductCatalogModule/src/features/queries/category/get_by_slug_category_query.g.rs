use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::category_repository::CategoryRepository;
use anyhow::Result;
use serde_json::Value;

pub struct GetBySlugCategoryQuery {
    pub values: Vec<Value>,
}

pub struct GetBySlugCategoryHandler;

impl Handler<GetBySlugCategoryQuery> for GetBySlugCategoryHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, query: GetBySlugCategoryQuery) -> Result<Self::Output> {
        CategoryRepository::get_by_slug(pool, query.values).await
    }
}
