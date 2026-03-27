import { QueryDatabaseUseCase } from '../../application/usecases/QueryDatabaseUseCase';
import {
  buildSqlServerConfigFromEnv,
  SqlServerClient,
} from '../../infrastructure/database/SqlServerClient';
import { logger } from '../../utils/logger';
import { DatabaseTools } from './DatabaseTools';
import { ToolModule } from './ToolModule';

export function registerToolModules(): ToolModule[] {
  const modules: ToolModule[] = [];

  try {
    const sqlClient = new SqlServerClient(buildSqlServerConfigFromEnv());
    const queryDatabaseUseCase = new QueryDatabaseUseCase(sqlClient);
    modules.push(new DatabaseTools(queryDatabaseUseCase));
    logger.info('Database tool module enabled.');
  } catch (error) {
    // Keep server bootable when optional integrations are not configured.
    logger.warn('Database tool module disabled due to invalid or missing DB configuration.', {
      error,
    });
  }

  return modules;
}
