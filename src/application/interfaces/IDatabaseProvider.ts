export type DatabaseScalar = string | number | boolean | null;

export type DatabaseQueryParameters = Record<string, DatabaseScalar>;

export interface DatabaseQueryRequest {
  sql: string;
  parameters?: DatabaseQueryParameters;
}

export interface DatabaseQueryResult {
  rows: Record<string, unknown>[];
  rowCount: number;
}

export interface IDatabaseProvider {
  query(request: DatabaseQueryRequest): Promise<DatabaseQueryResult>;
}
