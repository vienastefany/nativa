import mysql, { type Pool, type PoolConnection, type ResultSetHeader, type RowDataPacket } from "mysql2/promise";

export type SqlValue = string | number | boolean | Date | null;
export type SqlExecutor = Pool | PoolConnection;
const globalForDb = globalThis as unknown as { mysqlPool?: Pool };

// The build does not open a connection. All server modules share this pool.
export function getPool(): Pool {
  if (!globalForDb.mysqlPool) {
    const uri = process.env.DATABASE_URL;
    if (!uri) throw new Error("Falta DATABASE_URL para conectar a la base de datos");
    globalForDb.mysqlPool = mysql.createPool({
      uri, waitForConnections: true, connectionLimit: 10, maxIdle: 5,
      idleTimeout: 60_000, connectTimeout: 10_000, timezone: "Z",
      dateStrings: ["DATE"], multipleStatements: false, enableKeepAlive: true,
    });
  }
  return globalForDb.mysqlPool;
}

export async function queryRows<T>(sql: string, values: SqlValue[] = [], executor: SqlExecutor = getPool()): Promise<T[]> {
  const [rows] = await executor.execute<RowDataPacket[]>(sql, values);
  return rows as T[];
}
export async function executeSql(sql: string, values: SqlValue[] = [], executor: SqlExecutor = getPool()): Promise<ResultSetHeader> {
  const [result] = await executor.execute<ResultSetHeader>(sql, values);
  return result;
}
export async function withTransaction<T>(work: (connection: PoolConnection) => Promise<T>): Promise<T> {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
}
export async function closePool() {
  const pool = globalForDb.mysqlPool;
  globalForDb.mysqlPool = undefined;
  if (pool) await pool.end();
}
export function isDuplicateEntry(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ER_DUP_ENTRY";
}
export class RecordNotFoundError extends Error {
  constructor() { super("Registro no encontrado"); this.name = "RecordNotFoundError"; }
}
