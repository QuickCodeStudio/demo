use crate::db::DbPool;
use crate::repositories::category_repository::CategoryRepository;
use anyhow::Result;
use serde_json::Value;
use std::collections::HashMap;

pub struct CategoryService;

impl CategoryService {
    pub async fn list(pool: &DbPool, page: i64, page_size: i64) -> Result<Vec<Value>> {
        CategoryRepository::list(pool, page, page_size).await
    }

    pub async fn count(pool: &DbPool) -> Result<Vec<Value>> {
        CategoryRepository::count(pool).await
    }

    pub async fn get_item(pool: &DbPool, id: Value) -> Result<Option<Value>> {
        CategoryRepository::get_by_pk(pool, id).await
    }

    pub async fn insert(pool: &DbPool, body: HashMap<String, Value>) -> Result<Vec<Value>> {
        CategoryRepository::insert(pool, body).await
    }

    pub async fn update(pool: &DbPool, id: Value, body: HashMap<String, Value>) -> Result<Vec<Value>> {
        CategoryRepository::update(pool, id, body).await
    }

    pub async fn delete(pool: &DbPool, id: Value) -> Result<Vec<Value>> {
        CategoryRepository::delete(pool, id).await
    }

    pub async fn get_active(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        CategoryRepository::get_active(pool, values).await
    }

    pub async fn get_sub_categories(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        CategoryRepository::get_sub_categories(pool, values).await
    }

    pub async fn get_by_slug(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        CategoryRepository::get_by_slug(pool, values).await
    }

    pub async fn deactivate(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        CategoryRepository::deactivate(pool, values).await
    }
}
