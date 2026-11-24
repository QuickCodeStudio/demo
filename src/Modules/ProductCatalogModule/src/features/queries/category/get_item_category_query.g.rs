use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::category_repository::CategoryRepository;
use anyhow::Result;
use serde_json::Value;

pub struct GetItemCategoryQuery {
    pub id: serde_json::Value,
}

pub struct GetItemCategoryHandler;

impl Handler<GetItemCategoryQuery> for GetItemCategoryHandler {
    type Output = Option<Value>;

    async fn handle(pool: &DbPool, query: GetItemCategoryQuery) -> Result<Self::Output> {
        CategoryRepository::get_by_pk(pool, query.id).await
    }
}
