use crate::db::DbPool;
use crate::repositories::attribute_definition_repository::AttributeDefinitionRepository;
use anyhow::Result;
use serde_json::Value;
use std::collections::HashMap;

pub struct AttributeDefinitionService;

impl AttributeDefinitionService {
    pub async fn list(pool: &DbPool, page: i64, page_size: i64) -> Result<Vec<Value>> {
        AttributeDefinitionRepository::list(pool, page, page_size).await
    }

    pub async fn count(pool: &DbPool) -> Result<Vec<Value>> {
        AttributeDefinitionRepository::count(pool).await
    }

    pub async fn get_item(pool: &DbPool, id: Value) -> Result<Option<Value>> {
        AttributeDefinitionRepository::get_by_pk(pool, id).await
    }

    pub async fn insert(pool: &DbPool, body: HashMap<String, Value>) -> Result<Vec<Value>> {
        AttributeDefinitionRepository::insert(pool, body).await
    }

    pub async fn update(pool: &DbPool, id: Value, body: HashMap<String, Value>) -> Result<Vec<Value>> {
        AttributeDefinitionRepository::update(pool, id, body).await
    }

    pub async fn delete(pool: &DbPool, id: Value) -> Result<Vec<Value>> {
        AttributeDefinitionRepository::delete(pool, id).await
    }

    pub async fn get_by_code(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        AttributeDefinitionRepository::get_by_code(pool, values).await
    }
}
