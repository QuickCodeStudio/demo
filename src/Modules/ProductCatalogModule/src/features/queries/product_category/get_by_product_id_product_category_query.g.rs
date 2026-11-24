use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::product_category_repository::ProductCategoryRepository;
use anyhow::Result;
use serde_json::Value;

pub struct GetByProductIdProductCategoryQuery {
    pub values: Vec<Value>,
}

pub struct GetByProductIdProductCategoryHandler;

impl Handler<GetByProductIdProductCategoryQuery> for GetByProductIdProductCategoryHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, query: GetByProductIdProductCategoryQuery) -> Result<Self::Output> {
        ProductCategoryRepository::get_by_product_id(pool, query.values).await
    }
}
