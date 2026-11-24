use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::category_repository::CategoryRepository;
use anyhow::Result;
use serde_json::Value;

pub struct GetSubCategoriesCategoryQuery {
    pub values: Vec<Value>,
}

pub struct GetSubCategoriesCategoryHandler;

impl Handler<GetSubCategoriesCategoryQuery> for GetSubCategoriesCategoryHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, query: GetSubCategoriesCategoryQuery) -> Result<Self::Output> {
        CategoryRepository::get_sub_categories(pool, query.values).await
    }
}
