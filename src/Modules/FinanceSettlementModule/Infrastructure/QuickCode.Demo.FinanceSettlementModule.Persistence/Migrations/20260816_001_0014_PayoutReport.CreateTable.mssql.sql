IF OBJECT_ID(N'dbo.PAYOUT_REPORTS', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[PAYOUT_REPORTS] (
        [ID] int IDENTITY(1,1) NOT NULL,
        [PAYOUT_PERIOD_ID] int NOT NULL,
        [TOTAL_SELLERS] int NOT NULL,
        [TOTAL_PAYOUTS] int NOT NULL,
        [TOTAL_AMOUNT] decimal(18,2) NOT NULL,
        [SUCCESSFUL_PAYOUTS] int NOT NULL,
        [FAILED_PAYOUTS] int NOT NULL,
        [PENDING_PAYOUTS] int NOT NULL,
        [GENERATED_DATE] datetime2(7) NOT NULL,
        [IsDeleted] bit NOT NULL DEFAULT 0,
        [DeletedOnUtc] datetime2(7) NULL,
        CONSTRAINT [PK_PAYOUT_REPORTS] PRIMARY KEY ([ID])
    );
END;