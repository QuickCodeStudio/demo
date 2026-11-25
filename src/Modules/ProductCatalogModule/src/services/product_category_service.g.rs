use crate::db::DbPool;
use crate::repositories::product_category_repository::ProductCategoryRepository;
use anyhow::Result;
use serde_json::Value;
use std::collections::HashMap;

pub struct ProductCategoryService;

impl ProductCategoryService {
    pub async fn list(pool: &DbPool, page: i64, page_size: i64) -> Result<Vec<Value>> {
        ProductCategoryRepository::list(pool, page, page_size).await
    }

    pub async fn count(pool: &DbPool) -> Result<Vec<Value>> {
        ProductCategoryRepository::count(pool).await
    }

    pub async fn get_item(pool: &DbPool, product_id: Value, category_id: Value) -> Result<Option<Value>> {
        ProductCategoryRepository::get_by_pk(pool, product_id, category_id).await
    }

    pub async fn insert(pool: &DbPool, body: HashMap<String, Value>) -> Result<Vec<Value>> {
        ProductCategoryRepository::insert(pool, body).await
    }

    pub async fn update(pool: &DbPool, product_id: Value, category_id: Value, body: HashMap<String, Value>) -> Result<Vec<Value>> {
        ProductCategoryRepository::update(pool, product_id, category_id, body).await
    }

    pub async fn delete(pool: &DbPool, product_id: Value, category_id: Value) -> Result<Vec<Value>> {
        ProductCategoryRepository::delete(pool, product_id, category_id).await
    }

    pub async fn get_by_product_id(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        ProductCategoryRepository::get_by_product_id(pool, values).await
    }

    pub async fn get_by_category_id(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        ProductCategoryRepository::get_by_category_id(pool, values).await
    }

    pub async fn remove_from_category(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        ProductCategoryRepository::remove_from_category(pool, values).await
    }
}
