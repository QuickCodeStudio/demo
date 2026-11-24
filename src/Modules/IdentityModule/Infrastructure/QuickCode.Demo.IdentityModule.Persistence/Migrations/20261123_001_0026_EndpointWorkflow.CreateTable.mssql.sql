IF OBJECT_ID(N'dbo.EndpointWorkflows', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[EndpointWorkflows] (
        [Id] int IDENTITY(1,1) NOT NULL,
        [Name] nvarchar(500) NOT NULL,
        [ModuleName] nvarchar(250) NOT NULL,
        [EndpointPath] nvarchar(1000) NOT NULL,
        [HttpMethod] nvarchar(20) NOT NULL,
        [Description] nvarchar(max) NULL,
        [WorkflowContent] nvarchar(max) NOT NULL,
        [RunOnBff] bit NOT NULL DEFAULT 0,
        [IsActive] bit NOT NULL DEFAULT 0,
        [IsDeleted] bit NOT NULL DEFAULT 0,
        [DeletedOnUtc] datetime2(7) NULL,
        CONSTRAINT [PK_EndpointWorkflows] PRIMARY KEY ([Id])
    );
END;