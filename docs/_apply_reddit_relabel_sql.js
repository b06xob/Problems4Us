/**
 * Apply Reddit→community source relabel via mssql.
 * Correlation: cos-remove-reddit-20260802
 */
const fs = require("fs");
const path = require("path");
const sql = require("mssql");

const root = path.join(__dirname, "..");
const envPath = path.join(root, ".env.local");
const env = {};
for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#") || !t.includes("=")) continue;
  const i = t.indexOf("=");
  env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
}

async function main() {
  const config = {
    server: env.AZURE_SQL_SERVER,
    database: env.AZURE_SQL_DATABASE,
    user: env.AZURE_SQL_USER,
    password: env.AZURE_SQL_PASSWORD,
    options: { encrypt: true, trustServerCertificate: false },
  };
  const pool = await sql.connect(config);
  const before = await pool
    .request()
    .query("SELECT SourceType, COUNT(*) AS c FROM Sources GROUP BY SourceType");
  console.log(
    "before",
    Object.fromEntries(before.recordset.map((r) => [r.SourceType, r.c]))
  );

  const updSources = await pool.request().query(`
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
`);
  console.log("sources_rows", updSources.rowsAffected);

  const updPosts = await pool.request().query(`
UPDATE RawPosts
SET Url = ''
WHERE LOWER(ISNULL(Url, '')) LIKE '%reddit.com%'
   OR LOWER(ISNULL(Url, '')) LIKE '%redd.it%';
`);
  console.log("rawposts_rows", updPosts.rowsAffected);

  const after = await pool
    .request()
    .query("SELECT SourceType, COUNT(*) AS c FROM Sources GROUP BY SourceType");
  console.log(
    "after",
    Object.fromEntries(after.recordset.map((r) => [r.SourceType, r.c]))
  );

  const remSrc = await pool.request().query(`
SELECT COUNT(*) AS c FROM Sources
WHERE SourceType='reddit'
   OR LOWER(ISNULL(SourceUrl,'')) LIKE '%reddit%'
`);
  const remRaw = await pool.request().query(`
SELECT COUNT(*) AS c FROM RawPosts
WHERE LOWER(ISNULL(Url,'')) LIKE '%reddit%'
`);
  console.log("remaining_reddit_sources", remSrc.recordset[0].c);
  console.log("remaining_reddit_raw_urls", remRaw.recordset[0].c);
  await pool.close();
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
