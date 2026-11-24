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

pub struct ProductVariantAttributeRepository;

impl ProductVariantAttributeRepository {
    pub async fn list(pool: &DbPool, page: i64, page_size: i64) -> Result<Vec<Value>> {
        let sql = load_sql("ProductVariantAttribute", "Crud", "List")?;
        let offset = ((page.max(1) - 1) * page_size.max(1)).max(0);
        let mut named = HashMap::new();
        named.insert("PRM_QC_LIST_OFFSET".into(), json!(offset));
        named.insert("PRM_QC_LIST_PAGE_SIZE".into(), json!(page_size.max(1)));
        execute_sql_script(pool, &sql, &named).await
    }

    pub async fn count(pool: &DbPool) -> Result<Vec<Value>> {
        let sql = load_sql("ProductVariantAttribute", "Crud", "Count")?;
        let named = HashMap::new();
        execute_sql_script(pool, &sql, &named).await
    }

    pub async fn get_by_pk(pool: &DbPool, variant_id: Value, attribute_value_id: Value) -> Result<Option<Value>> {
        let sql = load_sql("ProductVariantAttribute", "Crud", "GetByPk")?;
        let mut named = HashMap::new();
        named.insert("PRM_PRODUCT_VARIANT_ATTRIBUTE_VARIANT_ID".into(), variant_id);
        named.insert("PRM_PRODUCT_VARIANT_ATTRIBUTE_ATTRIBUTE_VALUE_ID".into(), attribute_value_id);
        let rows = execute_sql_script(pool, &sql, &named).await?;
        Ok(rows.into_iter().next())
    }

    pub async fn insert(pool: &DbPool, body: HashMap<String, Value>) -> Result<Vec<Value>> {
        let sql = load_sql("ProductVariantAttribute", "Crud", "Insert")?;
        let mut named = HashMap::new();
        named.insert("PRM_PRODUCT_VARIANT_ATTRIBUTE_VARIANT_ID".into(), pick(&body, "variant_id", "VariantId"));
        named.insert("PRM_PRODUCT_VARIANT_ATTRIBUTE_ATTRIBUTE_VALUE_ID".into(), pick(&body, "attribute_value_id", "AttributeValueId"));
        execute_sql_script(pool, &sql, &named).await
    }

    pub async fn update(pool: &DbPool, variant_id: Value, attribute_value_id: Value, body: HashMap<String, Value>) -> Result<Vec<Value>> {
        let sql = load_sql("ProductVariantAttribute", "Crud", "Update")?;
        let mut named = HashMap::new();
        let variant_id_val = pick(&body, "variant_id", "VariantId");
        named.insert("PRM_PRODUCT_VARIANT_ATTRIBUTE_VARIANT_ID_REMOVE".into(), variant_id.clone());
        named.insert("PRM_PRODUCT_VARIANT_ATTRIBUTE_VARIANT_ID_ADD".into(), if variant_id_val.is_null() { variant_id.clone() } else { variant_id_val });
        let attribute_value_id_val = pick(&body, "attribute_value_id", "AttributeValueId");
        named.insert("PRM_PRODUCT_VARIANT_ATTRIBUTE_ATTRIBUTE_VALUE_ID_REMOVE".into(), attribute_value_id.clone());
        named.insert("PRM_PRODUCT_VARIANT_ATTRIBUTE_ATTRIBUTE_VALUE_ID_ADD".into(), if attribute_value_id_val.is_null() { attribute_value_id.clone() } else { attribute_value_id_val });
        execute_sql_script(pool, &sql, &named).await
    }

    pub async fn delete(pool: &DbPool, variant_id: Value, attribute_value_id: Value) -> Result<Vec<Value>> {
        let sql = load_sql("ProductVariantAttribute", "Crud", "Delete")?;
        let mut named = HashMap::new();
        named.insert("PRM_PRODUCT_VARIANT_ATTRIBUTE_VARIANT_ID".into(), variant_id);
        named.insert("PRM_PRODUCT_VARIANT_ATTRIBUTE_ATTRIBUTE_VALUE_ID".into(), attribute_value_id);
        execute_sql_script(pool, &sql, &named).await
    }

    pub async fn get_by_variant_id(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        let sql = load_sql("ProductVariantAttribute", "Query", "GetByVariantId")?;
        execute_sql_script_positional(pool, &sql, &values).await
    }

    pub async fn remove_attribute(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        let sql = load_sql("ProductVariantAttribute", "Command", "RemoveAttribute")?;
        execute_sql_script_positional(pool, &sql, &values).await
    }

}
