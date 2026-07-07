-- Add community source type and Problems4Us submission source

DECLARE @constraintName NVARCHAR(200);
SELECT @constraintName = cc.name
FROM sys.check_constraints cc
INNER JOIN sys.columns c ON cc.parent_object_id = c.object_id AND cc.parent_column_id = c.column_id
WHERE cc.parent_object_id = OBJECT_ID('Sources') AND c.name = 'SourceType';

IF @constraintName IS NOT NULL
BEGIN
    EXEC('ALTER TABLE Sources DROP CONSTRAINT ' + @constraintName);
END

ALTER TABLE Sources ADD CONSTRAINT CK_Sources_SourceType
    CHECK (SourceType IN ('reddit', 'github', 'forum', 'review', 'social', 'community'));

IF NOT EXISTS (SELECT 1 FROM Sources WHERE SourceId = 'src-problems4us')
BEGIN
    INSERT INTO Sources (SourceId, SourceType, SourceName, SourceUrl, IsActive)
    VALUES ('src-problems4us', 'community', 'Problems4Us', 'https://problems4us.com/submit', 1);
END
