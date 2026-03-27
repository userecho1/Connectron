import { QueryDatabaseUseCase } from '../../../application/usecases/database';
import {
  buildSqlServerConfigFromEnv,
  SqlServerClient,
} from '../../../infrastructure/database/SqlServerClient';
import { buildGithubServiceFromEnv, buildJiraServiceFromEnv, buildGitService } from '../../../infrastructure/services/integrations';
import { logger } from '../../../utils/logger';
import {
  ListPullRequestsUseCase,
  GetFileContentUseCase,
  CreateOrUpdateFileUseCase,
  CreatePullRequestUseCase,
  MergePullRequestUseCase,
} from '../../../application/usecases/github';
import { DatabaseTools, GithubTools, JiraTools, GitTools } from '../integrations';
import {
  SearchJiraIssuesUseCase,
  CreateTicketUseCase,
  AddJiraCommentUseCase,
  TransitionJiraIssueUseCase,
  UpdateJiraIssueFieldsUseCase,
} from '../../../application/usecases/jira';
import { WorkflowExecuteJiraStoryUseCase } from '../../../application/usecases/workflow';
import {
  GetGitStatusUseCase,
  GetGitLogUseCase,
  GitAddUseCase,
  GitCommitUseCase,
  GitPushUseCase,
  GitPullUseCase,
  GitCheckoutUseCase,
} from '../../../application/usecases/git';
import { ToolModule } from './ToolModule';
import { AnalyzeJavaProjectUseCase } from '../../../application/usecases/java-analysis';
import {
  JavaAnalysisService,
  CapabilityExtractionService,
  ToolGenerationService,
  DomainMcpGenerationService,
} from '../../../infrastructure/services/generation';
import {
  JavaAnalysisTools,
  CapabilityExtractionTools,
  ToolGeneratorTools,
  DomainMcpGeneratorTools,
  WorkflowEvolutionTools,
} from '../generation';
import { ExtractCapabilitiesUseCase } from '../../../application/usecases/capability-extractor';
import { GenerateMcpToolUseCase } from '../../../application/usecases/tool-generator';
import { GenerateDomainMcpServersUseCase } from '../../../application/usecases/domain-mcp-generator';
import { WorkflowExecuteMonolithEvolutionUseCase } from '../../../application/usecases/workflow';

export function registerToolModules(): ToolModule[] {
  const modules: ToolModule[] = [];

  try {
    const sqlClient = new SqlServerClient(buildSqlServerConfigFromEnv());
    const queryDatabaseUseCase = new QueryDatabaseUseCase(sqlClient);
    modules.push(new DatabaseTools(queryDatabaseUseCase));
    logger.info('Database tool module enabled.');
  } catch (error) {
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

  try {
    const capabilityExtractionService = new CapabilityExtractionService();
    const extractCapabilitiesUseCase = new ExtractCapabilitiesUseCase(capabilityExtractionService);
    modules.push(new CapabilityExtractionTools(extractCapabilitiesUseCase));
    logger.info('Capability extraction tool module enabled.');
  } catch (error) {
    logger.warn('Capability extraction tool module disabled.', { error });
  }

  try {
    const toolGenerationService = new ToolGenerationService();
    const generateMcpToolUseCase = new GenerateMcpToolUseCase(toolGenerationService);
    modules.push(new ToolGeneratorTools(generateMcpToolUseCase));
    logger.info('Tool generator module enabled.');
  } catch (error) {
    logger.warn('Tool generator module disabled.', { error });
  }

  try {
    const domainMcpGenerationService = new DomainMcpGenerationService();
    const generateDomainMcpServersUseCase = new GenerateDomainMcpServersUseCase(domainMcpGenerationService);
    modules.push(new DomainMcpGeneratorTools(generateDomainMcpServersUseCase));
    logger.info('Domain MCP generator module enabled.');
  } catch (error) {
    logger.warn('Domain MCP generator module disabled.', { error });
  }

  try {
    const javaAnalysisService = new JavaAnalysisService();
    const capabilityExtractionService = new CapabilityExtractionService();
    const toolGenerationService = new ToolGenerationService();
    const domainMcpGenerationService = new DomainMcpGenerationService();

    const workflowExecuteMonolithEvolutionUseCase = new WorkflowExecuteMonolithEvolutionUseCase(
      new AnalyzeJavaProjectUseCase(javaAnalysisService),
      new ExtractCapabilitiesUseCase(capabilityExtractionService),
      new GenerateMcpToolUseCase(toolGenerationService),
      new GenerateDomainMcpServersUseCase(domainMcpGenerationService),
    );

    modules.push(new WorkflowEvolutionTools(workflowExecuteMonolithEvolutionUseCase));
    logger.info('Workflow evolution tool module enabled.');
  } catch (error) {
    logger.warn('Workflow evolution tool module disabled.', { error });
  }

  return modules;
}

