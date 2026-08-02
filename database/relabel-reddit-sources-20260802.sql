-- Relabel legacy Reddit sources for public attribution.
-- Correlation: cos-remove-reddit-20260802
-- Safe to re-run.

UPDATE Sources
SET SourceType = 'community',
    SourceName = CASE
      WHEN SourceName LIKE 'r/%' THEN 'Community discussion'
      WHEN LOWER(SourceName) LIKE '%reddit%' THEN 'Community discussion'
      ELSE SourceName
    END,
    SourceUrl = CASE
      WHEN LOWER(ISNULL(SourceUrl, '')) LIKE '%reddit.com%' THEN ''
      WHEN LOWER(ISNULL(SourceUrl, '')) LIKE '%redd.it%' THEN ''
      ELSE SourceUrl
    END
WHERE SourceType = 'reddit'
   OR LOWER(ISNULL(SourceUrl, '')) LIKE '%reddit.com%'
   OR LOWER(ISNULL(SourceUrl, '')) LIKE '%redd.it%'
   OR SourceName LIKE 'r/%';

-- Scrub raw post URLs that point at Reddit (keep rows; hide origin link).
UPDATE RawPosts
SET Url = ''
WHERE LOWER(ISNULL(Url, '')) LIKE '%reddit.com%'
   OR LOWER(ISNULL(Url, '')) LIKE '%redd.it%';
