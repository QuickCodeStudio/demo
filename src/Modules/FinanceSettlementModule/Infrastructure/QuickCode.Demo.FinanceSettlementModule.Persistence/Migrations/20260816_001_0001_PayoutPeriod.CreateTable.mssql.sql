IF OBJECT_ID(N'dbo.PAYOUT_PERIODS', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[PAYOUT_PERIODS] (
        [ID] int IDENTITY(1,1) NOT NULL,
        [PERIOD_NAME] nvarchar(50) NOT NULL,
        [START_DATE] datetime2(7) NOT NULL,
        [END_DATE] datetime2(7) NOT NULL,
        [IS_CLOSED] bit NOT NULL DEFAULT 0,
        [CLOSED_DATE] datetime2(7) NOT NULL,
        [CREATED_DATE] datetime2(7) NOT NULL,
        [IsDeleted] bit NOT NULL DEFAULT 0,
        [DeletedOnUtc] datetime2(7) NULL,
        CONSTRAINT [PK_PAYOUT_PERIODS] PRIMARY KEY ([ID])
    );
END;