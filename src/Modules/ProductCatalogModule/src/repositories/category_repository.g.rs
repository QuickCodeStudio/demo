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

pub struct CategoryRepository;

impl CategoryRepository {
    pub async fn list(pool: &DbPool, page: i64, page_size: i64) -> Result<Vec<Value>> {
        let sql = load_sql("Category", "Crud", "List")?;
        let offset = ((page.max(1) - 1) * page_size.max(1)).max(0);
        let mut named = HashMap::new();
        named.insert("PRM_QC_LIST_OFFSET".into(), json!(offset));
        named.insert("PRM_QC_LIST_PAGE_SIZE".into(), json!(page_size.max(1)));
        execute_sql_script(pool, &sql, &named).await
    }

    pub async fn count(pool: &DbPool) -> Result<Vec<Value>> {
        let sql = load_sql("Category", "Crud", "Count")?;
        let named = HashMap::new();
        execute_sql_script(pool, &sql, &named).await
    }

    pub async fn get_by_pk(pool: &DbPool, id: Value) -> Result<Option<Value>> {
        let sql = load_sql("Category", "Crud", "GetByPk")?;
        let mut named = HashMap::new();
        named.insert("PRM_CATEGORY_ID".into(), id);
        let rows = execute_sql_script(pool, &sql, &named).await?;
        Ok(rows.into_iter().next())
    }

    pub async fn insert(pool: &DbPool, body: HashMap<String, Value>) -> Result<Vec<Value>> {
        let sql = load_sql("Category", "Crud", "Insert")?;
        let mut named = HashMap::new();
        named.insert("PRM_CATEGORY_PARENT_CATEGORY_ID".into(), pick(&body, "parent_category_id", "ParentCategoryId"));
        named.insert("PRM_CATEGORY_NAME".into(), pick(&body, "name", "Name"));
        named.insert("PRM_CATEGORY_SLUG".into(), pick(&body, "slug", "Slug"));
        named.insert("PRM_CATEGORY_ICON".into(), pick(&body, "icon", "Icon"));
        named.insert("PRM_CATEGORY_BANNER".into(), pick(&body, "banner", "Banner"));
        named.insert("PRM_CATEGORY_INTRO_VIDEO".into(), pick(&body, "intro_video", "IntroVideo"));
        named.insert("PRM_CATEGORY_IS_ACTIVE".into(), pick(&body, "is_active", "IsActive"));
        execute_sql_script(pool, &sql, &named).await
    }

    pub async fn update(pool: &DbPool, id: Value, body: HashMap<String, Value>) -> Result<Vec<Value>> {
        let sql = load_sql("Category", "Crud", "Update")?;
        let mut named = HashMap::new();
        named.insert("PRM_CATEGORY_PARENT_CATEGORY_ID".into(), pick(&body, "parent_category_id", "ParentCategoryId"));
        named.insert("PRM_CATEGORY_NAME".into(), pick(&body, "name", "Name"));
        named.insert("PRM_CATEGORY_SLUG".into(), pick(&body, "slug", "Slug"));
        named.insert("PRM_CATEGORY_ICON".into(), pick(&body, "icon", "Icon"));
        named.insert("PRM_CATEGORY_BANNER".into(), pick(&body, "banner", "Banner"));
        named.insert("PRM_CATEGORY_INTRO_VIDEO".into(), pick(&body, "intro_video", "IntroVideo"));
        named.insert("PRM_CATEGORY_IS_ACTIVE".into(), pick(&body, "is_active", "IsActive"));
        named.insert("PRM_CATEGORY_ID".into(), id);
        execute_sql_script(pool, &sql, &named).await
    }

    pub async fn delete(pool: &DbPool, id: Value) -> Result<Vec<Value>> {
        let sql = load_sql("Category", "Crud", "Delete")?;
        let mut named = HashMap::new();
        named.insert("PRM_CATEGORY_ID".into(), id);
        execute_sql_script(pool, &sql, &named).await
    }

    pub async fn get_active(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        let sql = load_sql("Category", "Query", "GetActive")?;
        execute_sql_script_positional(pool, &sql, &values).await
    }

    pub async fn get_sub_categories(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        let sql = load_sql("Category", "Query", "GetSubCategories")?;
        execute_sql_script_positional(pool, &sql, &values).await
    }

    pub async fn get_by_slug(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        let sql = load_sql("Category", "Query", "GetBySlug")?;
        execute_sql_script_positional(pool, &sql, &values).await
    }

    pub async fn deactivate(pool: &DbPool, values: Vec<Value>) -> Result<Vec<Value>> {
        let sql = load_sql("Category", "Command", "Deactivate")?;
        execute_sql_script_positional(pool, &sql, &values).await
    }

}
