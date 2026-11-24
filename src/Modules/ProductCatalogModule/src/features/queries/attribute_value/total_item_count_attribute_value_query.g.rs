use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::attribute_value_repository::AttributeValueRepository;
use anyhow::Result;

pub struct TotalItemCountAttributeValueQuery;

pub struct TotalItemCountAttributeValueHandler;

impl Handler<TotalItemCountAttributeValueQuery> for TotalItemCountAttributeValueHandler {
    type Output = i64;

    async fn handle(pool: &DbPool, _query: TotalItemCountAttributeValueQuery) -> Result<Self::Output> {
        let rows = AttributeValueRepository::count(pool).await?;
        Ok(crate::db::scalar_number(&rows))
    }
}
