use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::product_variant_repository::ProductVariantRepository;
use anyhow::Result;
use serde_json::Value;

pub struct GetItemProductVariantQuery {
    pub id: serde_json::Value,
}

pub struct GetItemProductVariantHandler;

impl Handler<GetItemProductVariantQuery> for GetItemProductVariantHandler {
    type Output = Option<Value>;

    async fn handle(pool: &DbPool, query: GetItemProductVariantQuery) -> Result<Self::Output> {
        ProductVariantRepository::get_by_pk(pool, query.id).await
    }
}
