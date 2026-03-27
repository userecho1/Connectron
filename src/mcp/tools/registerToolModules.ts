import { QueryDatabaseUseCase } from '../../application/usecases/QueryDatabaseUseCase';
import {
  buildSqlServerConfigFromEnv,
  SqlServerClient,
} from '../../infrastructure/database/SqlServerClient';
import { buildGithubServiceFromEnv } from '../../infrastructure/services/GithubService';
import { logger } from '../../utils/logger';
import { ListPullRequestsUseCase } from '../../application/usecases/ListPullRequestsUseCase';
import { DatabaseTools } from './DatabaseTools';
import { GithubTools } from './GithubTools';
import { SearchJiraIssuesUseCase } from '../../application/usecases/SearchJiraIssuesUseCase';
import { buildJiraServiceFromEnv } from '../../infrastructure/services/JiraService';
import { JiraTools } from './JiraTools';
import { GetGitInfoUseCase } from '../../application/usecases/GetGitInfoUseCase';
import { buildGitService } from '../../infrastructure/services/GitService';
import { GitTools } from './GitTools';
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

  try {
    const githubService = buildGithubServiceFromEnv();
    const listPullRequestsUseCase = new ListPullRequestsUseCase(githubService);
    modules.push(new GithubTools(listPullRequestsUseCase));
    logger.info('GitHub tool module enabled.');
  } catch (error) {
    logger.warn('GitHub tool module disabled due to invalid or missing GitHub configuration.', {
      error,
    });
  }

  try {
    const jiraService = buildJiraServiceFromEnv();
    const searchJiraIssuesUseCase = new SearchJiraIssuesUseCase(jiraService);
    modules.push(new JiraTools(searchJiraIssuesUseCase));
    logger.info('Jira tool module enabled.');
  } catch (error) {
    logger.warn('Jira tool module disabled due to invalid or missing Jira configuration.', {
      error,
    });
  }

  try {
    const gitService = buildGitService();
    const getGitInfoUseCase = new GetGitInfoUseCase(gitService);
    modules.push(new GitTools(getGitInfoUseCase));
    logger.info('Git tool module enabled.');
  } catch (error) {
    logger.warn('Git tool module disabled.', { error });
  }

  return modules;
}
