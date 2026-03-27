import {
  DatabaseQueryRequest,
  DatabaseQueryResult,
  IDatabaseProvider,
} from '../../../interfaces';

export class QueryDatabaseUseCase {
  constructor(private readonly databaseRepository: IDatabaseProvider) {}

  public async execute(request: DatabaseQueryRequest): Promise<DatabaseQueryResult> {
    const normalizedSql = request.sql.trim();
    if (!normalizedSql) {
      throw new Error('SQL query cannot be empty.');
    }

    // query_database is result-oriented read API; block mutating SQL statements.
    const upperSql = normalizedSql.toUpperCase();
    const forbidden = ['INSERT', 'UPDATE', 'DELETE', 'MERGE', 'DROP', 'ALTER', 'TRUNCATE', 'CREATE', 'EXEC'];
    const startsWithForbidden = forbidden.some((keyword) => upperSql.startsWith(keyword));
    if (startsWithForbidden) {
      throw new Error('Only read-only SELECT queries are allowed for query_database.');
    }

    return this.databaseRepository.query({
      sql: normalizedSql,
      parameters: request.parameters,
    });
  }
}


