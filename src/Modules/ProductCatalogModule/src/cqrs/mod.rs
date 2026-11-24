//! Nest `@nestjs/cqrs` / C# MediatR parity — typed message + handler, dispatched via [`send`].
//! Controllers/routes never call repositories directly under `ArchitecturalPattern::CqrsAndMediator`.

use crate::db::DbPool;
use anyhow::Result;

/// Marker for a query/command handler (one message type → one handler type).
pub trait Handler<M>: Send + Sync {
    type Output: Send;

    fn handle(
        pool: &DbPool,
        msg: M,
    ) -> impl std::future::Future<Output = Result<Self::Output>> + Send;
}

/// Nest `QueryBus.execute` / `CommandBus.execute` — dispatch `msg` to `H`.
pub async fn send<H, M>(pool: &DbPool, msg: M) -> Result<H::Output>
where
    H: Handler<M>,
    M: Send,
{
    H::handle(pool, msg).await
}
