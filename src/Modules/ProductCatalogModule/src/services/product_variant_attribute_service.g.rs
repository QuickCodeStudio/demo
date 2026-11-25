use crate::db::DbPool;
use crate::repositories::product_variant_attribute_repository::ProductVariantAttributeRepository;
use anyhow::Result;
use serde_json::Value;
use std::collections::HashMap;

pub struct ProductVariantAttributeService;

impl ProductVariantAttributeService {
    pub async fn list(pool: &DbPool, page: i64, page_size: i64) -> Result<Vec<Value>> {
        ProductVariantAttributeRepository::list(pool, page, page_size).await
    }

    pub async fn count(pool: &DbPool) -> Result<Vec<Value>> {
        ProductVariantAttributeRepository::count(pool).await
    }

    pub async fn get_item(pool: &DbPool, variant_id: Value, attribute_value_id: Value) -> Result<Option<Value>> {
        ProductVariantAttributeRepository::get_by_pk(pool, variant_id, attribute_value_id).await
    }

    pub async fn insert(pool: &DbPool, body: HashMap<String, Value>) -> Result<Vec<Value>> {
        ProductVariantAttributeRepository::insert(pool, body).await
    }

    pub async fn update(pool: &DbPool, variant_id: Value, attribute_value_id: Value, body: HashMap<String, Value>) -> Result<Vec<Value>> {
        ProductVariantAttributeRepository::update(pool, variant_id, attribute_value_id, body).await
    }

    pub async fn delete(pool: &DbPool, variant_id: Value, attribute_value_id: Value) -> Result<Vec<Value>> {
        ProductVariantAttributeRepository::delete(pool, variant_id, attribute_value_id).await
    }

    pub async fn get_by_variant_id(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        ProductVariantAttributeRepository::get_by_variant_id(pool, values).await
    }

    pub async fn remove_attribute(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        ProductVariantAttributeRepository::remove_attribute(pool, values).await
    }
}
