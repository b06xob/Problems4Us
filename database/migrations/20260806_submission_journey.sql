-- Additive columns for community submission journey (problems4us-36)
-- Idempotent; also applied at runtime via ensureUserSubmissionColumns().

IF OBJECT_ID(N'dbo.UserSubmissions', N'U') IS NOT NULL
  AND COL_LENGTH(N'dbo.UserSubmissions', N'ModerationAction') IS NULL
BEGIN
  ALTER TABLE dbo.UserSubmissions ADD ModerationAction NVARCHAR(40) NULL;
END
GO

IF OBJECT_ID(N'dbo.UserSubmissions', N'U') IS NOT NULL
  AND COL_LENGTH(N'dbo.UserSubmissions', N'ModerationReason') IS NULL
BEGIN
  ALTER TABLE dbo.UserSubmissions ADD ModerationReason NVARCHAR(400) NULL;
END
GO

IF OBJECT_ID(N'dbo.UserSubmissions', N'U') IS NOT NULL
  AND COL_LENGTH(N'dbo.UserSubmissions', N'LinkedPainPointId') IS NULL
BEGIN
  ALTER TABLE dbo.UserSubmissions ADD LinkedPainPointId NVARCHAR(50) NULL;
END
GO

IF OBJECT_ID(N'dbo.UserSubmissions', N'U') IS NOT NULL
  AND COL_LENGTH(N'dbo.UserSubmissions', N'PipelineOutcome') IS NULL
BEGIN
  ALTER TABLE dbo.UserSubmissions ADD PipelineOutcome NVARCHAR(40) NULL;
END
GO

IF OBJECT_ID(N'dbo.UserSubmissions', N'U') IS NOT NULL
  AND COL_LENGTH(N'dbo.UserSubmissions', N'ConfirmationEmailSentAt') IS NULL
BEGIN
  ALTER TABLE dbo.UserSubmissions ADD ConfirmationEmailSentAt DATETIME2 NULL;
END
GO

IF OBJECT_ID(N'dbo.UserSubmissions', N'U') IS NOT NULL
  AND COL_LENGTH(N'dbo.UserSubmissions', N'OutcomeEmailSentAt') IS NULL
BEGIN
  ALTER TABLE dbo.UserSubmissions ADD OutcomeEmailSentAt DATETIME2 NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM Sources WHERE SourceId = N'src-community-user-submissions')
BEGIN
  INSERT INTO Sources (SourceId, SourceType, SourceName, SourceUrl, IsActive)
  VALUES (
    N'src-community-user-submissions',
    N'community',
    N'Community user submissions',
    N'https://problems4us.com/submit',
    1
  );
END
GO
