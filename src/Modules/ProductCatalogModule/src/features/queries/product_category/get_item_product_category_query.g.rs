use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::product_category_repository::ProductCategoryRepository;
use anyhow::Result;
use serde_json::Value;

pub struct GetItemProductCategoryQuery {
    pub product_id: serde_json::Value,
    pub category_id: serde_json::Value,
}

pub struct GetItemProductCategoryHandler;

impl Handler<GetItemProductCategoryQuery> for GetItemProductCategoryHandler {
    type Output = Option<Value>;

    async fn handle(pool: &DbPool, query: GetItemProductCategoryQuery) -> Result<Self::Output> {
        ProductCategoryRepository::get_by_pk(pool, query.product_id, query.category_id).await
    }
}
