IF OBJECT_ID(N'dbo.COMMISSION_MODELS', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[COMMISSION_MODELS] (
        [ID] int IDENTITY(1,1) NOT NULL,
        [MODEL_NAME] nvarchar(250) NOT NULL,
        [DESCRIPTION] nvarchar(1000) NOT NULL,
        [COMMISSION_PERCENTAGE] decimal(18,8) NOT NULL,
        [IS_ACTIVE] bit NOT NULL DEFAULT 1,
        [CREATED_DATE] datetime2(7) NOT NULL,
        [IsDeleted] bit NOT NULL DEFAULT 0,
        [DeletedOnUtc] datetime2(7) NULL,
        CONSTRAINT [PK_COMMISSION_MODELS] PRIMARY KEY ([ID])
    );
END;