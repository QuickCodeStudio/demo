IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.EndpointWorkflows', N'U') AND name = N'IX_EndpointWorkflows_IsDeleted')
BEGIN
    CREATE INDEX [IX_EndpointWorkflows_IsDeleted] ON [dbo].[EndpointWorkflows] ([IsDeleted]);
END