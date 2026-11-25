use crate::db::DbPool;
use crate::repositories::product_repository::ProductRepository;
use anyhow::Result;
use serde_json::Value;
use std::collections::HashMap;

pub struct ProductService;

impl ProductService {
    pub async fn list(pool: &DbPool, page: i64, page_size: i64) -> Result<Vec<Value>> {
        ProductRepository::list(pool, page, page_size).await
    }

    pub async fn count(pool: &DbPool) -> Result<Vec<Value>> {
        ProductRepository::count(pool).await
    }

    pub async fn get_item(pool: &DbPool, id: Value) -> Result<Option<Value>> {
        ProductRepository::get_by_pk(pool, id).await
    }

    pub async fn insert(pool: &DbPool, body: HashMap<String, Value>) -> Result<Vec<Value>> {
        ProductRepository::insert(pool, body).await
    }

    pub async fn update(pool: &DbPool, id: Value, body: HashMap<String, Value>) -> Result<Vec<Value>> {
        ProductRepository::update(pool, id, body).await
    }

    pub async fn delete(pool: &DbPool, id: Value) -> Result<Vec<Value>> {
        ProductRepository::delete(pool, id).await
    }

    pub async fn get_by_sku(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        ProductRepository::get_by_sku(pool, values).await
    }

    pub async fn get_active_by_seller(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        ProductRepository::get_active_by_seller(pool, values).await
    }

    pub async fn search_products(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        ProductRepository::search_products(pool, values).await
    }

    pub async fn get_pending_approval(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        ProductRepository::get_pending_approval(pool, values).await
    }

    pub async fn get_featured(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        ProductRepository::get_featured(pool, values).await
    }

    pub async fn get_products_with_details(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        ProductRepository::get_products_with_details(pool, values).await
    }

    pub async fn get_count_by_status(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        ProductRepository::get_count_by_status(pool, values).await
    }

    pub async fn approve(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        ProductRepository::approve(pool, values).await
    }

    pub async fn reject(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        ProductRepository::reject(pool, values).await
    }

    pub async fn set_featured(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        ProductRepository::set_featured(pool, values).await
    }
}
