IF OBJECT_ID(N'dbo.COMMISSION_RULES', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[COMMISSION_RULES] (
        [ID] int IDENTITY(1,1) NOT NULL,
        [COMMISSION_MODEL_ID] int NOT NULL,
        [RULE_NAME] nvarchar(250) NOT NULL,
        [MIN_ORDER_VALUE] decimal(18,2) NOT NULL,
        [MAX_ORDER_VALUE] decimal(18,2) NOT NULL,
        [OVERRIDE_PERCENTAGE] decimal(18,8) NOT NULL,
        [IS_ACTIVE] bit NOT NULL DEFAULT 1,
        [CREATED_DATE] datetime2(7) NOT NULL,
        [IsDeleted] bit NOT NULL DEFAULT 0,
        [DeletedOnUtc] datetime2(7) NULL,
        CONSTRAINT [PK_COMMISSION_RULES] PRIMARY KEY ([ID])
    );
END;