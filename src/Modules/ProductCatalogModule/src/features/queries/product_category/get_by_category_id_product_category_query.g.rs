use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::product_category_repository::ProductCategoryRepository;
use anyhow::Result;
use serde_json::Value;

pub struct GetByCategoryIdProductCategoryQuery {
    pub values: Vec<Value>,
}

pub struct GetByCategoryIdProductCategoryHandler;

impl Handler<GetByCategoryIdProductCategoryQuery> for GetByCategoryIdProductCategoryHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, query: GetByCategoryIdProductCategoryQuery) -> Result<Self::Output> {
        ProductCategoryRepository::get_by_category_id(pool, query.values).await
    }
}
