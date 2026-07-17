-- M1.4: Waitlist + conversion event tables (idempotent)
IF OBJECT_ID(N'dbo.WaitlistEntries', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.WaitlistEntries (
    WaitlistId   NVARCHAR(50)  NOT NULL PRIMARY KEY,
    Email        NVARCHAR(200) NOT NULL,
    Source       NVARCHAR(50)  NOT NULL CONSTRAINT DF_Waitlist_Source DEFAULT ('other'),
    CreatedAt    DATETIME2     NOT NULL CONSTRAINT DF_Waitlist_CreatedAt DEFAULT (GETUTCDATE())
  );
  CREATE UNIQUE INDEX UX_WaitlistEntries_Email ON dbo.WaitlistEntries(Email);
  CREATE INDEX IX_WaitlistEntries_CreatedAt ON dbo.WaitlistEntries(CreatedAt DESC);
END
GO

IF OBJECT_ID(N'dbo.ConversionEvents', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.ConversionEvents (
    EventId      NVARCHAR(50)  NOT NULL PRIMARY KEY,
    EventName    NVARCHAR(80)  NOT NULL,
    Path         NVARCHAR(500) NULL,
    PropsJson    NVARCHAR(MAX) NULL,
    CreatedAt    DATETIME2     NOT NULL CONSTRAINT DF_ConversionEvents_CreatedAt DEFAULT (GETUTCDATE())
  );
  CREATE INDEX IX_ConversionEvents_Name_Created
    ON dbo.ConversionEvents(EventName, CreatedAt DESC);
END
GO
