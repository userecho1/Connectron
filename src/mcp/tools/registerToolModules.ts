import { QueryDatabaseUseCase } from '../../application/usecases/database';
import {
  buildSqlServerConfigFromEnv,
  SqlServerClient,
} from '../../infrastructure/database/SqlServerClient';
import { buildGithubServiceFromEnv } from '../../infrastructure/services/GithubService';
import { logger } from '../../utils/logger';
import {
  ListPullRequestsUseCase,
  GetFileContentUseCase,
  CreateOrUpdateFileUseCase,
  CreatePullRequestUseCase,
  MergePullRequestUseCase,
} from '../../application/usecases/github';
import { DatabaseTools } from './DatabaseTools';
import { GithubTools } from './GithubTools';
import {
  SearchJiraIssuesUseCase,
  CreateTicketUseCase,
  AddJiraCommentUseCase,
  TransitionJiraIssueUseCase,
  UpdateJiraIssueFieldsUseCase,
} from '../../application/usecases/jira';
import { WorkflowExecuteJiraStoryUseCase } from '../../application/usecases/workflow';
import { buildJiraServiceFromEnv } from '../../infrastructure/services/JiraService';
import { JiraTools } from './JiraTools';
import {
  GetGitStatusUseCase,
  GetGitLogUseCase,
  GitAddUseCase,
  GitCommitUseCase,
  GitPushUseCase,
  GitPullUseCase,
  GitCheckoutUseCase,
} from '../../application/usecases/git';
import { buildGitService } from '../../infrastructure/services/GitService';
import { GitTools } from './GitTools';
import { ToolModule } from './ToolModule';
import { AnalyzeJavaProjectUseCase } from '../../application/usecases/java-analysis';
import { JavaAnalysisService } from '../../infrastructure/services/JavaAnalysisService';
import { JavaAnalysisTools } from './JavaAnalysisTools';

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
    const getGitStatusUseCase = new GetGitStatusUseCase(gitService);
    const getGitLogUseCase = new GetGitLogUseCase(gitService);
    const gitAddUseCase = new GitAddUseCase(gitService);
    const gitCommitUseCase = new GitCommitUseCase(gitService);
    const gitPushUseCase = new GitPushUseCase(gitService);
    const gitPullUseCase = new GitPullUseCase(gitService);
    const gitCheckoutUseCase = new GitCheckoutUseCase(gitService);
    modules.push(
      new GitTools(
        getGitStatusUseCase,
        getGitLogUseCase,
        gitAddUseCase,
        gitCommitUseCase,
        gitPushUseCase,
        gitPullUseCase,
        gitCheckoutUseCase,
      ),
    );
    logger.info('Git tool module enabled.');
  } catch (error) {
    logger.warn('Git tool module disabled.', { error });
  }

  try {
    const javaAnalysisService = new JavaAnalysisService();
    const analyzeJavaProjectUseCase = new AnalyzeJavaProjectUseCase(javaAnalysisService);
    modules.push(new JavaAnalysisTools(analyzeJavaProjectUseCase));
    logger.info('Java analysis tool module enabled.');
  } catch (error) {
    logger.warn('Java analysis tool module disabled.', { error });
  }

  return modules;
}
