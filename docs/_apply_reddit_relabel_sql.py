"""Apply Reddit→community source relabel via mssql if available."""
from __future__ import annotations

import os
import re
from pathlib import Path

ROOT = Path(r"C:\Users\b06xo\OneDrive\Test\Problems4US")
ENV = ROOT / ".env.local"
SQL = (ROOT / "database" / "relabel-reddit-sources-20260802.sql").read_text(encoding="utf-8")

# Load env without printing secrets
env = {}
for line in ENV.read_text(encoding="utf-8").splitlines():
    line = line.strip()
    if not line or line.startswith("#") or "=" not in line:
        continue
    k, v = line.split("=", 1)
    env[k.strip()] = v.strip()

server = env.get("AZURE_SQL_SERVER")
database = env.get("AZURE_SQL_DATABASE")
user = env.get("AZURE_SQL_USER")
password = env.get("AZURE_SQL_PASSWORD")
if not all([server, database, user, password]):
    raise SystemExit("Missing Azure SQL env in .env.local")

try:
    import pyodbc
except ImportError:
    raise SystemExit("pyodbc not installed")

conn_str = (
    f"Driver={{ODBC Driver 18 for SQL Server}};"
    f"Server=tcp:{server},1433;Database={database};Uid={user};Pwd={password};"
    "Encrypt=yes;TrustServerCertificate=no;Connection Timeout=30;"
)
conn = pyodbc.connect(conn_str)
cur = conn.cursor()

# Count before
cur.execute("SELECT SourceType, COUNT(*) AS c FROM Sources GROUP BY SourceType")
before = {row.SourceType: row.c for row in cur.fetchall()}
print("before", before)

# Execute batches split on GO-less statements (file has two UPDATEs)
for stmt in [s.strip() for s in SQL.split(";") if s.strip() and not s.strip().startswith("--")]:
    # skip pure comment blocks already handled
    if not stmt.upper().startswith("UPDATE"):
        continue
    cur.execute(stmt)
    print("rows affected", cur.rowcount)

conn.commit()
cur.execute("SELECT SourceType, COUNT(*) AS c FROM Sources GROUP BY SourceType")
after = {row.SourceType: row.c for row in cur.fetchall()}
print("after", after)
cur.execute(
    "SELECT COUNT(*) FROM Sources WHERE SourceType='reddit' OR LOWER(ISNULL(SourceUrl,'')) LIKE '%reddit%'"
)
print("remaining_reddit_sources", cur.fetchone()[0])
cur.execute(
    "SELECT COUNT(*) FROM RawPosts WHERE LOWER(ISNULL(Url,'')) LIKE '%reddit%'"
)
print("remaining_reddit_raw_urls", cur.fetchone()[0])
conn.close()
print("ok")
