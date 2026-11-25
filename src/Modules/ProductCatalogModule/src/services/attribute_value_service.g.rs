use crate::db::DbPool;
use crate::repositories::attribute_value_repository::AttributeValueRepository;
use anyhow::Result;
use serde_json::Value;
use std::collections::HashMap;

pub struct AttributeValueService;

impl AttributeValueService {
    pub async fn list(pool: &DbPool, page: i64, page_size: i64) -> Result<Vec<Value>> {
        AttributeValueRepository::list(pool, page, page_size).await
    }

    pub async fn count(pool: &DbPool) -> Result<Vec<Value>> {
        AttributeValueRepository::count(pool).await
    }

    pub async fn get_item(pool: &DbPool, id: Value) -> Result<Option<Value>> {
        AttributeValueRepository::get_by_pk(pool, id).await
    }

    pub async fn insert(pool: &DbPool, body: HashMap<String, Value>) -> Result<Vec<Value>> {
        AttributeValueRepository::insert(pool, body).await
    }

    pub async fn update(pool: &DbPool, id: Value, body: HashMap<String, Value>) -> Result<Vec<Value>> {
        AttributeValueRepository::update(pool, id, body).await
    }

    pub async fn delete(pool: &DbPool, id: Value) -> Result<Vec<Value>> {
        AttributeValueRepository::delete(pool, id).await
    }

    pub async fn get_by_attribute_id(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        AttributeValueRepository::get_by_attribute_id(pool, values).await
    }
}
