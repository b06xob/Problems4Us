import sql from 'mssql';

let pool: sql.ConnectionPool | null = null;
let poolPromise: Promise<sql.ConnectionPool> | null = null;

export function getSqlConfig(): string | sql.config {
  const connectionString = process.env.AZURE_SQL_CONNECTION_STRING;
  if (connectionString) {
    return connectionString;
  }

  const server = process.env.AZURE_SQL_SERVER;
  const database = process.env.AZURE_SQL_DATABASE;
  const user = process.env.AZURE_SQL_USER;
  const password = process.env.AZURE_SQL_PASSWORD;

  if (!server || !database || !user || !password) {
    throw new Error(
      'Database not configured. Set AZURE_SQL_CONNECTION_STRING or AZURE_SQL_SERVER/DATABASE/USER/PASSWORD.'
    );
  }

  return {
    server,
    database,
    user,
    password,
    options: {
      encrypt: true,
      trustServerCertificate: false,
    },
  };
}

export async function getPool(): Promise<sql.ConnectionPool> {
  if (pool?.connected) {
    return pool;
  }

  if (!poolPromise) {
    poolPromise = sql.connect(getSqlConfig()).then((connectedPool) => {
      pool = connectedPool;
      return connectedPool;
    });
  }

  return poolPromise;
}

export async function query<T>(
  queryText: string,
  inputs?: Record<string, unknown>
): Promise<T[]> {
  const p = await getPool();
  const request = p.request();

  if (inputs) {
    for (const [key, value] of Object.entries(inputs)) {
      request.input(key, value);
    }
  }

  const result = await request.query<T>(queryText);
  return result.recordset;
}

export async function queryOne<T>(
  queryText: string,
  inputs?: Record<string, unknown>
): Promise<T | undefined> {
  const rows = await query<T>(queryText, inputs);
  return rows[0];
}

export async function execute(
  queryText: string,
  inputs?: Record<string, unknown>
): Promise<number> {
  const p = await getPool();
  const request = p.request();

  if (inputs) {
    for (const [key, value] of Object.entries(inputs)) {
      request.input(key, value);
    }
  }

  const result = await request.query(queryText);
  return result.rowsAffected[0] ?? 0;
}

export async function checkDbConnection(): Promise<boolean> {
  try {
    await queryOne<{ ok: number }>('SELECT 1 AS ok');
    return true;
  } catch {
    return false;
  }
}

export { sql };
