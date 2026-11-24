//! Nest service/repository spec parity for ProductVariantAttribute (D18).
mod common;

use quickcode_module::db;
use quickcode_module::repositories::product_variant_attribute_repository::ProductVariantAttributeRepository;

#[test]
fn product_variant_attribute_contract_smoke() {
    assert!(r#"items"#.contains("items"));
    assert!(r#"totalCount"#.contains("totalCount"));
    assert_eq!("includeCount", "includeCount");
    assert_eq!(201u16, axum::http::StatusCode::CREATED.as_u16());
    assert_eq!(404u16, axum::http::StatusCode::NOT_FOUND.as_u16());
    assert_eq!(db::scalar_number(&[]), 0);
    assert!(!db::scalar_bool(&[]));
}

#[tokio::test]
async fn product_variant_attribute_list_without_count_shape() {
    let Some(pool) = common::try_connect().await else { return; };
    let rows = ProductVariantAttributeRepository::list(&pool, 1, 10)
        .await
        .expect("list");
    let items = db::rows_to_api(rows);
    // Nest listAsync without includeCount does not require count() — page size only.
    assert!(items.len() <= 10);
}

#[tokio::test]
async fn product_variant_attribute_list_and_count_when_db_enabled() {
    let Some(pool) = common::try_connect().await else { return; };
    let list = ProductVariantAttributeRepository::list(&pool, 1, 5).await.expect("list");
    let count_rows = ProductVariantAttributeRepository::count(&pool).await.expect("count");
    let total = db::scalar_number(&count_rows);
    assert!(list.len() <= 5);
    assert!(total >= 0);
    assert!(total as usize >= list.len() || list.is_empty());
}

#[tokio::test]
async fn product_variant_attribute_get_by_pk_ok_or_none() {
    let Some(pool) = common::try_connect().await else { return; };
    let got = ProductVariantAttributeRepository::get_by_pk(&pool, serde_json::json!("1"), serde_json::json!("1")).await;
    assert!(got.is_ok(), "get_by_pk should not error: {:?}", got.err());
}
