use crate::db::DbPool;
use crate::repositories::product_variant_repository::ProductVariantRepository;
use anyhow::Result;
use serde_json::Value;
use std::collections::HashMap;

pub struct ProductVariantService;

impl ProductVariantService {
    pub async fn list(pool: &DbPool, page: i64, page_size: i64) -> Result<Vec<Value>> {
        ProductVariantRepository::list(pool, page, page_size).await
    }

    pub async fn count(pool: &DbPool) -> Result<Vec<Value>> {
        ProductVariantRepository::count(pool).await
    }

    pub async fn get_item(pool: &DbPool, id: Value) -> Result<Option<Value>> {
        ProductVariantRepository::get_by_pk(pool, id).await
    }

    pub async fn insert(pool: &DbPool, body: HashMap<String, Value>) -> Result<Vec<Value>> {
        ProductVariantRepository::insert(pool, body).await
    }

    pub async fn update(pool: &DbPool, id: Value, body: HashMap<String, Value>) -> Result<Vec<Value>> {
        ProductVariantRepository::update(pool, id, body).await
    }

    pub async fn delete(pool: &DbPool, id: Value) -> Result<Vec<Value>> {
        ProductVariantRepository::delete(pool, id).await
    }

    pub async fn get_by_product_id(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        ProductVariantRepository::get_by_product_id(pool, values).await
    }

    pub async fn get_active_by_product_id(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        ProductVariantRepository::get_active_by_product_id(pool, values).await
    }

    pub async fn get_low_stock_variants(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        ProductVariantRepository::get_low_stock_variants(pool, values).await
    }

    pub async fn update_stock(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        ProductVariantRepository::update_stock(pool, values).await
    }

    pub async fn update_price(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        ProductVariantRepository::update_price(pool, values).await
    }

    pub async fn deactivate(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        ProductVariantRepository::deactivate(pool, values).await
    }
}
