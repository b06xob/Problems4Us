-- Problems4Us Database Schema
-- Azure SQL Database compatible

-- Sources: Data collection endpoints
CREATE TABLE Sources (
    SourceId        NVARCHAR(50)   PRIMARY KEY,
    SourceType      NVARCHAR(20)   NOT NULL CHECK (SourceType IN ('reddit', 'github', 'forum', 'review', 'social')),
    SourceName      NVARCHAR(200)  NOT NULL,
    SourceUrl       NVARCHAR(500),
    IsActive        BIT            DEFAULT 1,
    CreatedAt       DATETIME2      DEFAULT GETUTCDATE()
);

CREATE INDEX IX_Sources_Type ON Sources(SourceType);
CREATE INDEX IX_Sources_Active ON Sources(IsActive);

-- RawPosts: Raw collected data from sources
CREATE TABLE RawPosts (
    RawPostId       NVARCHAR(50)   PRIMARY KEY,
    SourceId        NVARCHAR(50)   NOT NULL REFERENCES Sources(SourceId),
    ExternalId      NVARCHAR(200),
    Title           NVARCHAR(500),
    Body            NVARCHAR(MAX),
    Author          NVARCHAR(200),
    Url             NVARCHAR(500),
    PublishedAt     DATETIME2,
    CollectedAt     DATETIME2      DEFAULT GETUTCDATE(),
    RawJson         NVARCHAR(MAX)
);

CREATE INDEX IX_RawPosts_Source ON RawPosts(SourceId);
CREATE INDEX IX_RawPosts_Published ON RawPosts(PublishedAt);

-- PainPoints: Extracted and scored customer pain points
CREATE TABLE PainPoints (
    PainPointId             NVARCHAR(50)   PRIMARY KEY,
    Title                   NVARCHAR(500)  NOT NULL,
    Summary                 NVARCHAR(MAX),
    Category                NVARCHAR(100),
    SeverityScore           INT            CHECK (SeverityScore BETWEEN 0 AND 100),
    FrequencyScore          INT            CHECK (FrequencyScore BETWEEN 0 AND 100),
    WillingnessToPayScore   INT            CHECK (WillingnessToPayScore BETWEEN 0 AND 100),
    MarketSizeScore         INT            CHECK (MarketSizeScore BETWEEN 0 AND 100),
    TrendScore              INT            CHECK (TrendScore BETWEEN 0 AND 100),
    OpportunityScore        INT            CHECK (OpportunityScore BETWEEN 0 AND 100),
    FirstSeenAt             DATETIME2,
    LastSeenAt              DATETIME2,
    Status                  NVARCHAR(20)   DEFAULT 'active' CHECK (Status IN ('active', 'resolved', 'monitoring'))
);

CREATE INDEX IX_PainPoints_Category ON PainPoints(Category);
CREATE INDEX IX_PainPoints_OpportunityScore ON PainPoints(OpportunityScore DESC);
CREATE INDEX IX_PainPoints_Status ON PainPoints(Status);
CREATE INDEX IX_PainPoints_LastSeen ON PainPoints(LastSeenAt DESC);

-- PainPointMentions: Links raw posts to extracted pain points
CREATE TABLE PainPointMentions (
    MentionId       NVARCHAR(50)   PRIMARY KEY,
    PainPointId     NVARCHAR(50)   NOT NULL REFERENCES PainPoints(PainPointId),
    RawPostId       NVARCHAR(50)   NOT NULL REFERENCES RawPosts(RawPostId),
    ExtractedText   NVARCHAR(MAX),
    SentimentScore  DECIMAL(5,2),
    SeverityScore   INT,
    CreatedAt       DATETIME2      DEFAULT GETUTCDATE()
);

CREATE INDEX IX_Mentions_PainPoint ON PainPointMentions(PainPointId);
CREATE INDEX IX_Mentions_RawPost ON PainPointMentions(RawPostId);

-- Clusters: Groups of related pain points
CREATE TABLE Clusters (
    ClusterId       NVARCHAR(50)   PRIMARY KEY,
    ClusterName     NVARCHAR(200)  NOT NULL,
    Description     NVARCHAR(MAX),
    Category        NVARCHAR(100),
    CreatedAt       DATETIME2      DEFAULT GETUTCDATE()
);

CREATE INDEX IX_Clusters_Category ON Clusters(Category);

-- ClusterPainPoints: Many-to-many junction
CREATE TABLE ClusterPainPoints (
    ClusterId       NVARCHAR(50)   NOT NULL REFERENCES Clusters(ClusterId),
    PainPointId     NVARCHAR(50)   NOT NULL REFERENCES PainPoints(PainPointId),
    PRIMARY KEY (ClusterId, PainPointId)
);

-- ProductIdeas: AI-generated product suggestions
CREATE TABLE ProductIdeas (
    ProductIdeaId           NVARCHAR(50)   PRIMARY KEY,
    PainPointId             NVARCHAR(50)   NOT NULL REFERENCES PainPoints(PainPointId),
    Name                    NVARCHAR(200)  NOT NULL,
    Description             NVARCHAR(MAX),
    TargetCustomer          NVARCHAR(500),
    MVPFeatures             NVARCHAR(MAX),
    DifficultyScore         INT            CHECK (DifficultyScore BETWEEN 0 AND 100),
    RevenuePotentialScore   INT            CHECK (RevenuePotentialScore BETWEEN 0 AND 100),
    ExistingAlternatives    NVARCHAR(MAX),
    RecommendedFirstFeature NVARCHAR(500),
    CreatedAt               DATETIME2      DEFAULT GETUTCDATE()
);

CREATE INDEX IX_ProductIdeas_PainPoint ON ProductIdeas(PainPointId);
CREATE INDEX IX_ProductIdeas_Revenue ON ProductIdeas(RevenuePotentialScore DESC);

-- TrendSnapshots: Historical tracking data
CREATE TABLE TrendSnapshots (
    SnapshotId      NVARCHAR(50)   PRIMARY KEY,
    PainPointId     NVARCHAR(50)   NOT NULL REFERENCES PainPoints(PainPointId),
    SnapshotDate    DATE           NOT NULL,
    MentionCount    INT,
    AverageSeverity DECIMAL(5,2),
    OpportunityScore INT
);

CREATE INDEX IX_TrendSnapshots_PainPoint_Date ON TrendSnapshots(PainPointId, SnapshotDate);

-- UserSubmissions: Problems submitted by users seeking solutions
CREATE TABLE UserSubmissions (
    SubmissionId        NVARCHAR(50)   PRIMARY KEY,
    Title               NVARCHAR(500)  NOT NULL,
    Description         NVARCHAR(MAX)  NOT NULL,
    Category            NVARCHAR(100)  NOT NULL,
    Urgency             NVARCHAR(20)   NOT NULL CHECK (Urgency IN ('low', 'medium', 'high', 'critical')),
    SubmitterName       NVARCHAR(200),
    SubmitterEmail      NVARCHAR(200),
    Status              NVARCHAR(20)   DEFAULT 'pending' CHECK (Status IN ('pending', 'reviewing', 'accepted', 'declined')),
    CreatedAt           DATETIME2      DEFAULT GETUTCDATE(),
    UpdatedAt           DATETIME2      DEFAULT GETUTCDATE()
);

CREATE INDEX IX_UserSubmissions_Category ON UserSubmissions(Category);
CREATE INDEX IX_UserSubmissions_Urgency ON UserSubmissions(Urgency);
CREATE INDEX IX_UserSubmissions_Status ON UserSubmissions(Status);
CREATE INDEX IX_UserSubmissions_CreatedAt ON UserSubmissions(CreatedAt DESC);
