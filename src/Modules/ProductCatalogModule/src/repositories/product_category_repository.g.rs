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

pub struct ProductCategoryRepository;

impl ProductCategoryRepository {
    pub async fn list(pool: &DbPool, page: i64, page_size: i64) -> Result<Vec<Value>> {
        let sql = load_sql("ProductCategory", "Crud", "List")?;
        let offset = ((page.max(1) - 1) * page_size.max(1)).max(0);
        let mut named = HashMap::new();
        named.insert("PRM_QC_LIST_OFFSET".into(), json!(offset));
        named.insert("PRM_QC_LIST_PAGE_SIZE".into(), json!(page_size.max(1)));
        execute_sql_script(pool, &sql, &named).await
    }

    pub async fn count(pool: &DbPool) -> Result<Vec<Value>> {
        let sql = load_sql("ProductCategory", "Crud", "Count")?;
        let named = HashMap::new();
        execute_sql_script(pool, &sql, &named).await
    }

    pub async fn get_by_pk(pool: &DbPool, product_id: Value, category_id: Value) -> Result<Option<Value>> {
        let sql = load_sql("ProductCategory", "Crud", "GetByPk")?;
        let mut named = HashMap::new();
        named.insert("PRM_PRODUCT_CATEGORY_PRODUCT_ID".into(), product_id);
        named.insert("PRM_PRODUCT_CATEGORY_CATEGORY_ID".into(), category_id);
        let rows = execute_sql_script(pool, &sql, &named).await?;
        Ok(rows.into_iter().next())
    }

    pub async fn insert(pool: &DbPool, body: HashMap<String, Value>) -> Result<Vec<Value>> {
        let sql = load_sql("ProductCategory", "Crud", "Insert")?;
        let mut named = HashMap::new();
        named.insert("PRM_PRODUCT_CATEGORY_PRODUCT_ID".into(), pick(&body, "product_id", "ProductId"));
        named.insert("PRM_PRODUCT_CATEGORY_CATEGORY_ID".into(), pick(&body, "category_id", "CategoryId"));
        execute_sql_script(pool, &sql, &named).await
    }

    pub async fn update(pool: &DbPool, product_id: Value, category_id: Value, body: HashMap<String, Value>) -> Result<Vec<Value>> {
        let sql = load_sql("ProductCategory", "Crud", "Update")?;
        let mut named = HashMap::new();
        let product_id_val = pick(&body, "product_id", "ProductId");
        named.insert("PRM_PRODUCT_CATEGORY_PRODUCT_ID_REMOVE".into(), product_id.clone());
        named.insert("PRM_PRODUCT_CATEGORY_PRODUCT_ID_ADD".into(), if product_id_val.is_null() { product_id.clone() } else { product_id_val });
        let category_id_val = pick(&body, "category_id", "CategoryId");
        named.insert("PRM_PRODUCT_CATEGORY_CATEGORY_ID_REMOVE".into(), category_id.clone());
        named.insert("PRM_PRODUCT_CATEGORY_CATEGORY_ID_ADD".into(), if category_id_val.is_null() { category_id.clone() } else { category_id_val });
        execute_sql_script(pool, &sql, &named).await
    }

    pub async fn delete(pool: &DbPool, product_id: Value, category_id: Value) -> Result<Vec<Value>> {
        let sql = load_sql("ProductCategory", "Crud", "Delete")?;
        let mut named = HashMap::new();
        named.insert("PRM_PRODUCT_CATEGORY_PRODUCT_ID".into(), product_id);
        named.insert("PRM_PRODUCT_CATEGORY_CATEGORY_ID".into(), category_id);
        execute_sql_script(pool, &sql, &named).await
    }

    pub async fn get_by_product_id(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        let sql = load_sql("ProductCategory", "Query", "GetByProductId")?;
        execute_sql_script_positional(pool, &sql, &values).await
    }

    pub async fn get_by_category_id(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        let sql = load_sql("ProductCategory", "Query", "GetByCategoryId")?;
        execute_sql_script_positional(pool, &sql, &values).await
    }

    pub async fn remove_from_category(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        let sql = load_sql("ProductCategory", "Command", "RemoveFromCategory")?;
        execute_sql_script_positional(pool, &sql, &values).await
    }

}
