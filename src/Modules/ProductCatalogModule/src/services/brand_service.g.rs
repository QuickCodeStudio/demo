use crate::db::DbPool;
use crate::repositories::brand_repository::BrandRepository;
use anyhow::Result;
use serde_json::Value;
use std::collections::HashMap;

pub struct BrandService;

impl BrandService {
    pub async fn list(pool: &DbPool, page: i64, page_size: i64) -> Result<Vec<Value>> {
        BrandRepository::list(pool, page, page_size).await
    }

    pub async fn count(pool: &DbPool) -> Result<Vec<Value>> {
        BrandRepository::count(pool).await
    }

    pub async fn get_item(pool: &DbPool, id: Value) -> Result<Option<Value>> {
        BrandRepository::get_by_pk(pool, id).await
    }

    pub async fn insert(pool: &DbPool, body: HashMap<String, Value>) -> Result<Vec<Value>> {
        BrandRepository::insert(pool, body).await
    }

    pub async fn update(pool: &DbPool, id: Value, body: HashMap<String, Value>) -> Result<Vec<Value>> {
        BrandRepository::update(pool, id, body).await
    }

    pub async fn delete(pool: &DbPool, id: Value) -> Result<Vec<Value>> {
        BrandRepository::delete(pool, id).await
    }

    pub async fn get_active(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        BrandRepository::get_active(pool, values).await
    }

    pub async fn search_by_name(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        BrandRepository::search_by_name(pool, values).await
    }

    pub async fn deactivate(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        BrandRepository::deactivate(pool, values).await
    }
}
