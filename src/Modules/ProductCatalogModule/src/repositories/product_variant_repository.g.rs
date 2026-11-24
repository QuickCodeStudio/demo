use crate::db::{execute_sql_script, execute_sql_script_positional, execute_sql_script_positional_count, load_sql, DbPool};
use anyhow::Result;
use serde_json::{json, Value};
use std::collections::HashMap;

fn pick(body: &HashMap<String, Value>, snake: &str, pascal: &str) -> Value {
    body.get(snake)
        .cloned()
        .or_else(|| body.get(pascal).cloned())
        .or_else(|| {
            let camel: String = {
                let mut chars = pascal.chars();
                match chars.next() {
                    None => String::new(),
                    Some(f) => f.to_lowercase().collect::<String>() + chars.as_str(),
                }
            };
            body.get(&camel).cloned()
        })
        .unwrap_or(Value::Null)
}

pub struct ProductVariantRepository;

impl ProductVariantRepository {
    pub async fn list(pool: &DbPool, page: i64, page_size: i64) -> Result<Vec<Value>> {
        let sql = load_sql("ProductVariant", "Crud", "List")?;
        let offset = ((page.max(1) - 1) * page_size.max(1)).max(0);
        let mut named = HashMap::new();
        named.insert("PRM_QC_LIST_OFFSET".into(), json!(offset));
        named.insert("PRM_QC_LIST_PAGE_SIZE".into(), json!(page_size.max(1)));
        execute_sql_script(pool, &sql, &named).await
    }

    pub async fn count(pool: &DbPool) -> Result<Vec<Value>> {
        let sql = load_sql("ProductVariant", "Crud", "Count")?;
        let named = HashMap::new();
        execute_sql_script(pool, &sql, &named).await
    }

    pub async fn get_by_pk(pool: &DbPool, id: Value) -> Result<Option<Value>> {
        let sql = load_sql("ProductVariant", "Crud", "GetByPk")?;
        let mut named = HashMap::new();
        named.insert("PRM_PRODUCT_VARIANT_ID".into(), id);
        let rows = execute_sql_script(pool, &sql, &named).await?;
        Ok(rows.into_iter().next())
    }

    pub async fn insert(pool: &DbPool, body: HashMap<String, Value>) -> Result<Vec<Value>> {
        let sql = load_sql("ProductVariant", "Crud", "Insert")?;
        let mut named = HashMap::new();
        named.insert("PRM_PRODUCT_VARIANT_PRODUCT_ID".into(), pick(&body, "product_id", "ProductId"));
        named.insert("PRM_PRODUCT_VARIANT_SKU".into(), pick(&body, "sku", "Sku"));
        named.insert("PRM_PRODUCT_VARIANT_PRICE".into(), pick(&body, "price", "Price"));
        named.insert("PRM_PRODUCT_VARIANT_STOCK_QUANTITY".into(), pick(&body, "stock_quantity", "StockQuantity"));
        named.insert("PRM_PRODUCT_VARIANT_IS_ACTIVE".into(), pick(&body, "is_active", "IsActive"));
        execute_sql_script(pool, &sql, &named).await
    }

    pub async fn update(pool: &DbPool, id: Value, body: HashMap<String, Value>) -> Result<Vec<Value>> {
        let sql = load_sql("ProductVariant", "Crud", "Update")?;
        let mut named = HashMap::new();
        named.insert("PRM_PRODUCT_VARIANT_PRODUCT_ID".into(), pick(&body, "product_id", "ProductId"));
        named.insert("PRM_PRODUCT_VARIANT_SKU".into(), pick(&body, "sku", "Sku"));
        named.insert("PRM_PRODUCT_VARIANT_PRICE".into(), pick(&body, "price", "Price"));
        named.insert("PRM_PRODUCT_VARIANT_STOCK_QUANTITY".into(), pick(&body, "stock_quantity", "StockQuantity"));
        named.insert("PRM_PRODUCT_VARIANT_IS_ACTIVE".into(), pick(&body, "is_active", "IsActive"));
        named.insert("PRM_PRODUCT_VARIANT_ID".into(), id);
        execute_sql_script(pool, &sql, &named).await
    }

    pub async fn delete(pool: &DbPool, id: Value) -> Result<Vec<Value>> {
        let sql = load_sql("ProductVariant", "Crud", "Delete")?;
        let mut named = HashMap::new();
        named.insert("PRM_PRODUCT_VARIANT_ID".into(), id);
        execute_sql_script(pool, &sql, &named).await
    }

    pub async fn get_by_product_id(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        let sql = load_sql("ProductVariant", "Query", "GetByProductId")?;
        execute_sql_script_positional(pool, &sql, &values).await
    }

    pub async fn get_active_by_product_id(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        let sql = load_sql("ProductVariant", "Query", "GetActiveByProductId")?;
        execute_sql_script_positional(pool, &sql, &values).await
    }

    pub async fn get_low_stock_variants(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        let sql = load_sql("ProductVariant", "Query", "GetLowStockVariants")?;
        execute_sql_script_positional(pool, &sql, &values).await
    }

    pub async fn update_stock(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        let sql = load_sql("ProductVariant", "Command", "UpdateStock")?;
        execute_sql_script_positional(pool, &sql, &values).await
    }

    pub async fn update_price(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        let sql = load_sql("ProductVariant", "Command", "UpdatePrice")?;
        execute_sql_script_positional(pool, &sql, &values).await
    }

    pub async fn deactivate(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        let sql = load_sql("ProductVariant", "Command", "Deactivate")?;
        execute_sql_script_positional(pool, &sql, &values).await
    }

}
