import { QueryDatabaseUseCase } from '../../application/usecases/QueryDatabaseUseCase';
import {
  buildSqlServerConfigFromEnv,
  SqlServerClient,
} from '../../infrastructure/database/SqlServerClient';
import { buildGithubServiceFromEnv } from '../../infrastructure/services/GithubService';
import { logger } from '../../utils/logger';
import { ListPullRequestsUseCase } from '../../application/usecases/ListPullRequestsUseCase';
import { GetFileContentUseCase } from '../../application/usecases/GetFileContentUseCase';
import { CreateOrUpdateFileUseCase } from '../../application/usecases/CreateOrUpdateFileUseCase';
import { CreatePullRequestUseCase } from '../../application/usecases/CreatePullRequestUseCase';
import { MergePullRequestUseCase } from '../../application/usecases/MergePullRequestUseCase';
import { DatabaseTools } from './DatabaseTools';
import { GithubTools } from './GithubTools';
import { SearchJiraIssuesUseCase } from '../../application/usecases/SearchJiraIssuesUseCase';
import { CreateTicketUseCase } from '../../application/usecases/CreateTicketUseCase';
import { AddJiraCommentUseCase } from '../../application/usecases/AddJiraCommentUseCase';
import { TransitionJiraIssueUseCase } from '../../application/usecases/TransitionJiraIssueUseCase';
import { UpdateJiraIssueFieldsUseCase } from '../../application/usecases/UpdateJiraIssueFieldsUseCase';
import { WorkflowExecuteJiraStoryUseCase } from '../../application/usecases/WorkflowExecuteJiraStoryUseCase';
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
    const getFileContentUseCase = new GetFileContentUseCase(githubService);
    const createOrUpdateFileUseCase = new CreateOrUpdateFileUseCase(githubService);
    const createPullRequestUseCase = new CreatePullRequestUseCase(githubService);
    const mergePullRequestUseCase = new MergePullRequestUseCase(githubService);
    modules.push(
      new GithubTools(
        listPullRequestsUseCase,
        getFileContentUseCase,
        createOrUpdateFileUseCase,
        createPullRequestUseCase,
        mergePullRequestUseCase,
      ),
    );
    logger.info('GitHub tool module enabled.');
  } catch (error) {
    logger.warn('GitHub tool module disabled due to invalid or missing GitHub configuration.', {
      error,
    });
  }

  try {
    const jiraService = buildJiraServiceFromEnv();
    const searchJiraIssuesUseCase = new SearchJiraIssuesUseCase(jiraService);
    const createTicketUseCase = new CreateTicketUseCase(jiraService);
    const addJiraCommentUseCase = new AddJiraCommentUseCase(jiraService);
    const transitionJiraIssueUseCase = new TransitionJiraIssueUseCase(jiraService);
    const updateJiraIssueFieldsUseCase = new UpdateJiraIssueFieldsUseCase(jiraService);
    const workflowExecuteJiraStoryUseCase = new WorkflowExecuteJiraStoryUseCase(jiraService);
    modules.push(
      new JiraTools(
        searchJiraIssuesUseCase,
        createTicketUseCase,
        addJiraCommentUseCase,
        transitionJiraIssueUseCase,
        updateJiraIssueFieldsUseCase,
        workflowExecuteJiraStoryUseCase,
      ),
    );
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
