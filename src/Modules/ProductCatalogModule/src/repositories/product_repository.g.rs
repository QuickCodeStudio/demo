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

pub struct ProductRepository;

impl ProductRepository {
    pub async fn list(pool: &DbPool, page: i64, page_size: i64) -> Result<Vec<Value>> {
        let sql = load_sql("Product", "Crud", "List")?;
        let offset = ((page.max(1) - 1) * page_size.max(1)).max(0);
        let mut named = HashMap::new();
        named.insert("PRM_QC_LIST_OFFSET".into(), json!(offset));
        named.insert("PRM_QC_LIST_PAGE_SIZE".into(), json!(page_size.max(1)));
        execute_sql_script(pool, &sql, &named).await
    }

    pub async fn count(pool: &DbPool) -> Result<Vec<Value>> {
        let sql = load_sql("Product", "Crud", "Count")?;
        let named = HashMap::new();
        execute_sql_script(pool, &sql, &named).await
    }

    pub async fn get_by_pk(pool: &DbPool, id: Value) -> Result<Option<Value>> {
        let sql = load_sql("Product", "Crud", "GetByPk")?;
        let mut named = HashMap::new();
        named.insert("PRM_PRODUCT_ID".into(), id);
        let rows = execute_sql_script(pool, &sql, &named).await?;
        Ok(rows.into_iter().next())
    }

    pub async fn insert(pool: &DbPool, body: HashMap<String, Value>) -> Result<Vec<Value>> {
        let sql = load_sql("Product", "Crud", "Insert")?;
        let mut named = HashMap::new();
        named.insert("PRM_PRODUCT_SELLER_ID".into(), pick(&body, "seller_id", "SellerId"));
        named.insert("PRM_PRODUCT_BRAND_ID".into(), pick(&body, "brand_id", "BrandId"));
        named.insert("PRM_PRODUCT_PRIMARY_CATEGORY_ID".into(), pick(&body, "primary_category_id", "PrimaryCategoryId"));
        named.insert("PRM_PRODUCT_SKU".into(), pick(&body, "sku", "Sku"));
        named.insert("PRM_PRODUCT_NAME".into(), pick(&body, "name", "Name"));
        named.insert("PRM_PRODUCT_DESCRIPTION".into(), pick(&body, "description", "Description"));
        named.insert("PRM_PRODUCT_PHOTO".into(), pick(&body, "photo", "Photo"));
        named.insert("PRM_PRODUCT_VIDEO".into(), pick(&body, "video", "Video"));
        named.insert("PRM_PRODUCT_DATASHEET".into(), pick(&body, "datasheet", "Datasheet"));
        named.insert("PRM_PRODUCT_STATUS".into(), pick(&body, "status", "Status"));
        named.insert("PRM_PRODUCT_IS_FEATURED".into(), pick(&body, "is_featured", "IsFeatured"));
        named.insert("PRM_PRODUCT_CREATED_DATE".into(), pick(&body, "created_date", "CreatedDate"));
        execute_sql_script(pool, &sql, &named).await
    }

    pub async fn update(pool: &DbPool, id: Value, body: HashMap<String, Value>) -> Result<Vec<Value>> {
        let sql = load_sql("Product", "Crud", "Update")?;
        let mut named = HashMap::new();
        named.insert("PRM_PRODUCT_SELLER_ID".into(), pick(&body, "seller_id", "SellerId"));
        named.insert("PRM_PRODUCT_BRAND_ID".into(), pick(&body, "brand_id", "BrandId"));
        named.insert("PRM_PRODUCT_PRIMARY_CATEGORY_ID".into(), pick(&body, "primary_category_id", "PrimaryCategoryId"));
        named.insert("PRM_PRODUCT_SKU".into(), pick(&body, "sku", "Sku"));
        named.insert("PRM_PRODUCT_NAME".into(), pick(&body, "name", "Name"));
        named.insert("PRM_PRODUCT_DESCRIPTION".into(), pick(&body, "description", "Description"));
        named.insert("PRM_PRODUCT_PHOTO".into(), pick(&body, "photo", "Photo"));
        named.insert("PRM_PRODUCT_VIDEO".into(), pick(&body, "video", "Video"));
        named.insert("PRM_PRODUCT_DATASHEET".into(), pick(&body, "datasheet", "Datasheet"));
        named.insert("PRM_PRODUCT_STATUS".into(), pick(&body, "status", "Status"));
        named.insert("PRM_PRODUCT_IS_FEATURED".into(), pick(&body, "is_featured", "IsFeatured"));
        named.insert("PRM_PRODUCT_CREATED_DATE".into(), pick(&body, "created_date", "CreatedDate"));
        named.insert("PRM_PRODUCT_ID".into(), id);
        execute_sql_script(pool, &sql, &named).await
    }

    pub async fn delete(pool: &DbPool, id: Value) -> Result<Vec<Value>> {
        let sql = load_sql("Product", "Crud", "Delete")?;
        let mut named = HashMap::new();
        named.insert("PRM_PRODUCT_ID".into(), id);
        execute_sql_script(pool, &sql, &named).await
    }

    pub async fn get_by_sku(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        let sql = load_sql("Product", "Query", "GetBySku")?;
        execute_sql_script_positional(pool, &sql, &values).await
    }

    pub async fn get_active_by_seller(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        let sql = load_sql("Product", "Query", "GetActiveBySeller")?;
        execute_sql_script_positional(pool, &sql, &values).await
    }

    pub async fn search_products(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        let sql = load_sql("Product", "Query", "SearchProducts")?;
        execute_sql_script_positional(pool, &sql, &values).await
    }

    pub async fn get_pending_approval(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        let sql = load_sql("Product", "Query", "GetPendingApproval")?;
        execute_sql_script_positional(pool, &sql, &values).await
    }

    pub async fn get_featured(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        let sql = load_sql("Product", "Query", "GetFeatured")?;
        execute_sql_script_positional(pool, &sql, &values).await
    }

    pub async fn get_products_with_details(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        let sql = load_sql("Product", "Query", "GetProductsWithDetails")?;
        execute_sql_script_positional(pool, &sql, &values).await
    }

    pub async fn get_count_by_status(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        let sql = load_sql("Product", "Query", "GetCountByStatus")?;
        execute_sql_script_positional(pool, &sql, &values).await
    }

    pub async fn approve(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        let sql = load_sql("Product", "Command", "Approve")?;
        execute_sql_script_positional(pool, &sql, &values).await
    }

    pub async fn reject(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        let sql = load_sql("Product", "Command", "Reject")?;
        execute_sql_script_positional(pool, &sql, &values).await
    }

    pub async fn set_featured(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        let sql = load_sql("Product", "Command", "SetFeatured")?;
        execute_sql_script_positional(pool, &sql, &values).await
    }

}
