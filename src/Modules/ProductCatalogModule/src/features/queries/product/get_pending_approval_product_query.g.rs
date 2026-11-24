use crate::cqrs::Handler;
use crate::db::DbPool;
use crate::repositories::product_repository::ProductRepository;
use anyhow::Result;
use serde_json::Value;

pub struct GetPendingApprovalProductQuery {
    pub values: Vec<Value>,
}

pub struct GetPendingApprovalProductHandler;

impl Handler<GetPendingApprovalProductQuery> for GetPendingApprovalProductHandler {
    type Output = Vec<Value>;

    async fn handle(pool: &DbPool, query: GetPendingApprovalProductQuery) -> Result<Self::Output> {
        ProductRepository::get_pending_approval(pool, query.values).await
    }
}
