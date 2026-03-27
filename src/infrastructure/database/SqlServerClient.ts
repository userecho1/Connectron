import * as sql from 'mssql';
import type { config as SqlConfig, ConnectionPool } from 'mssql';
import {
  DatabaseQueryRequest,
  DatabaseQueryResult,
  IDatabaseProvider,
} from '../../application/interfaces';
import { env } from '../../config/env';
import { ILogger, logger } from '../../utils/logger';

export class SqlServerClient implements IDatabaseProvider {
  private pool: ConnectionPool | null = null;

  constructor(
    private readonly sqlConfig: SqlConfig,
    private readonly appLogger: ILogger = logger
  ) {}

  public async query(request: DatabaseQueryRequest): Promise<DatabaseQueryResult> {
    try {
      const pool = await this.getOrCreatePool();
      const queryRequest = pool.request();

      if (request.parameters) {
        for (const [name, value] of Object.entries(request.parameters)) {
          queryRequest.input(name, value as sql.ISqlTypeFactory | unknown);
        }
      }

      const result = await queryRequest.query(request.sql);
      const rows = (result.recordset ?? []) as Record<string, unknown>[];
      const rowCount = result.rowsAffected?.[0] ?? rows.length;

      return { rows, rowCount };
    } catch (error) {
      this.appLogger.error('SQL Server query failed', error, {
        sqlPreview: request.sql.slice(0, 120),
      });
      throw new Error('Database query execution failed.');
    }
  }

  public async close(): Promise<void> {
    if (this.pool) {
      await this.pool.close();
      this.pool = null;
    }
  }

  private async getOrCreatePool(): Promise<ConnectionPool> {
    if (this.pool?.connected) {
      return this.pool;
    }

    this.pool = new sql.ConnectionPool(this.sqlConfig);
    this.pool.on('error', (error: Error) => {
      this.appLogger.error('SQL Server pool error', error);
    });

    await this.pool.connect();
    return this.pool;
  }
}

export function buildSqlServerConfigFromEnv(): any {
  if (!env.DB_HOST || !env.DB_USER || !env.DB_PASS || !env.DB_NAME) {
    throw new Error('Missing SQL Server environment configuration.');
  }

  return {
    server: env.DB_HOST,
    user: env.DB_USER,
    password: env.DB_PASS,
    database: env.DB_NAME,
    port: env.DB_PORT,
    options: {
      encrypt: true,
      trustServerCertificate: true,
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  } as SqlConfig;
}

