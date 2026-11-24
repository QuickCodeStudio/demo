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

pub struct AttributeValueRepository;

impl AttributeValueRepository {
    pub async fn list(pool: &DbPool, page: i64, page_size: i64) -> Result<Vec<Value>> {
        let sql = load_sql("AttributeValue", "Crud", "List")?;
        let offset = ((page.max(1) - 1) * page_size.max(1)).max(0);
        let mut named = HashMap::new();
        named.insert("PRM_QC_LIST_OFFSET".into(), json!(offset));
        named.insert("PRM_QC_LIST_PAGE_SIZE".into(), json!(page_size.max(1)));
        execute_sql_script(pool, &sql, &named).await
    }

    pub async fn count(pool: &DbPool) -> Result<Vec<Value>> {
        let sql = load_sql("AttributeValue", "Crud", "Count")?;
        let named = HashMap::new();
        execute_sql_script(pool, &sql, &named).await
    }

    pub async fn get_by_pk(pool: &DbPool, id: Value) -> Result<Option<Value>> {
        let sql = load_sql("AttributeValue", "Crud", "GetByPk")?;
        let mut named = HashMap::new();
        named.insert("PRM_ATTRIBUTE_VALUE_ID".into(), id);
        let rows = execute_sql_script(pool, &sql, &named).await?;
        Ok(rows.into_iter().next())
    }

    pub async fn insert(pool: &DbPool, body: HashMap<String, Value>) -> Result<Vec<Value>> {
        let sql = load_sql("AttributeValue", "Crud", "Insert")?;
        let mut named = HashMap::new();
        named.insert("PRM_ATTRIBUTE_VALUE_ATTRIBUTE_ID".into(), pick(&body, "attribute_id", "AttributeId"));
        named.insert("PRM_ATTRIBUTE_VALUE_VALUE".into(), pick(&body, "value", "Value"));
        execute_sql_script(pool, &sql, &named).await
    }

    pub async fn update(pool: &DbPool, id: Value, body: HashMap<String, Value>) -> Result<Vec<Value>> {
        let sql = load_sql("AttributeValue", "Crud", "Update")?;
        let mut named = HashMap::new();
        named.insert("PRM_ATTRIBUTE_VALUE_ATTRIBUTE_ID".into(), pick(&body, "attribute_id", "AttributeId"));
        named.insert("PRM_ATTRIBUTE_VALUE_VALUE".into(), pick(&body, "value", "Value"));
        named.insert("PRM_ATTRIBUTE_VALUE_ID".into(), id);
        execute_sql_script(pool, &sql, &named).await
    }

    pub async fn delete(pool: &DbPool, id: Value) -> Result<Vec<Value>> {
        let sql = load_sql("AttributeValue", "Crud", "Delete")?;
        let mut named = HashMap::new();
        named.insert("PRM_ATTRIBUTE_VALUE_ID".into(), id);
        execute_sql_script(pool, &sql, &named).await
    }

    pub async fn get_by_attribute_id(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        let sql = load_sql("AttributeValue", "Query", "GetByAttributeId")?;
        execute_sql_script_positional(pool, &sql, &values).await
    }

}
