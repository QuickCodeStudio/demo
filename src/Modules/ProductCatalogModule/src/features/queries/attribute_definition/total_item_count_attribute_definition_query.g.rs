use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::attribute_definition_repository::AttributeDefinitionRepository;
use anyhow::Result;

pub struct TotalItemCountAttributeDefinitionQuery;

pub struct TotalItemCountAttributeDefinitionHandler;

impl Handler<TotalItemCountAttributeDefinitionQuery> for TotalItemCountAttributeDefinitionHandler {
    type Output = i64;

    async fn handle(pool: &DbPool, _query: TotalItemCountAttributeDefinitionQuery) -> Result<Self::Output> {
        let rows = AttributeDefinitionRepository::count(pool).await?;
        Ok(crate::db::scalar_number(&rows))
    }
}
