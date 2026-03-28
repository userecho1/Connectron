import {
  QueryDatabaseUseCase,
  ListPullRequestsUseCase,
  GetFileContentUseCase,
  CreateOrUpdateFileUseCase,
  CreatePullRequestUseCase,
  MergePullRequestUseCase,
  SearchJiraIssuesUseCase,
  CreateTicketUseCase,
  AddJiraCommentUseCase,
  TransitionJiraIssueUseCase,
  UpdateJiraIssueFieldsUseCase,
  WorkflowExecuteJiraStoryUseCase,
  GetGitStatusUseCase,
  GetGitLogUseCase,
  GitAddUseCase,
  GitCommitUseCase,
  GitPushUseCase,
  GitPullUseCase,
  GitCheckoutUseCase,
  AnalyzeJavaProjectUseCase,
  ExtractCapabilitiesUseCase,
  GenerateMcpToolUseCase,
  GenerateDomainMcpServersUseCase,
  WorkflowExecuteMonolithEvolutionUseCase,
} from '../../../application/usecases';
import {
  buildSqlServerConfigFromEnv,
  SqlServerClient,
} from '../../../infrastructure/database/SqlServerClient';
import { buildGithubServiceFromEnv, buildJiraServiceFromEnv, buildGitService } from '../../../infrastructure/services/integrations';
import { logger } from '../../../utils/logger';
import { DatabaseTools, GithubTools, JiraTools, GitTools } from '../integrations';
import { SamplingTestTools } from './SamplingTestTools';
import { ToolModule } from './ToolModule';
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

type ModuleRegistrar = (modules: ToolModule[]) => void;

function registerSafely(register: ModuleRegistrar, disabledMessage: string): ModuleRegistrar {
  return (modules: ToolModule[]) => {
    try {
      register(modules);
    } catch (error) {
      logger.warn(disabledMessage, { error });
    }
  };
}

function registerDatabaseTools(modules: ToolModule[]): void {
  const sqlClient = new SqlServerClient(buildSqlServerConfigFromEnv());
  const queryDatabaseUseCase = new QueryDatabaseUseCase(sqlClient);
  modules.push(new DatabaseTools(queryDatabaseUseCase));
  logger.info('Database tool module enabled.');
}

function registerGithubTools(modules: ToolModule[]): void {
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
}

function registerJiraTools(modules: ToolModule[]): void {
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
}

function registerGitTools(modules: ToolModule[]): void {
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
}

function registerJavaAnalysisTools(modules: ToolModule[]): void {
  const javaAnalysisService = new JavaAnalysisService();
  const analyzeJavaProjectUseCase = new AnalyzeJavaProjectUseCase(javaAnalysisService);
  modules.push(new JavaAnalysisTools(analyzeJavaProjectUseCase));
  logger.info('Java analysis tool module enabled.');
}

function registerCapabilityExtractionTools(modules: ToolModule[]): void {
  const capabilityExtractionService = new CapabilityExtractionService();
  const extractCapabilitiesUseCase = new ExtractCapabilitiesUseCase(capabilityExtractionService);
  modules.push(new CapabilityExtractionTools(extractCapabilitiesUseCase));
  logger.info('Capability extraction tool module enabled.');
}

function registerToolGeneratorTools(modules: ToolModule[]): void {
  const toolGenerationService = new ToolGenerationService();
  const generateMcpToolUseCase = new GenerateMcpToolUseCase(toolGenerationService);
  modules.push(new ToolGeneratorTools(generateMcpToolUseCase));
  logger.info('Tool generator module enabled.');
}

function registerDomainMcpGeneratorTools(modules: ToolModule[]): void {
  const domainMcpGenerationService = new DomainMcpGenerationService();
  const generateDomainMcpServersUseCase = new GenerateDomainMcpServersUseCase(domainMcpGenerationService);
  modules.push(new DomainMcpGeneratorTools(generateDomainMcpServersUseCase));
  logger.info('Domain MCP generator module enabled.');
}

function registerWorkflowEvolutionTools(modules: ToolModule[]): void {
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
}

export function registerToolModules(): ToolModule[] {
  const modules: ToolModule[] = [];

  // Register baseline utility tool modules unconditionally
  modules.push(new SamplingTestTools());

  const registerAll: Array<ModuleRegistrar> = [
    registerSafely(registerDatabaseTools, 'Database tool module disabled due to invalid or missing DB configuration.'),
    registerSafely(registerGithubTools, 'GitHub tool module disabled due to invalid or missing GitHub configuration.'),
    registerSafely(registerJiraTools, 'Jira tool module disabled due to invalid or missing Jira configuration.'),
    registerSafely(registerGitTools, 'Git tool module disabled.'),
    registerSafely(registerJavaAnalysisTools, 'Java analysis tool module disabled.'),
    registerSafely(registerCapabilityExtractionTools, 'Capability extraction tool module disabled.'),
    registerSafely(registerToolGeneratorTools, 'Tool generator module disabled.'),
    registerSafely(registerDomainMcpGeneratorTools, 'Domain MCP generator module disabled.'),
    registerSafely(registerWorkflowEvolutionTools, 'Workflow evolution tool module disabled.'),
  ];

  for (const register of registerAll) {
    register(modules);
  }

  return modules;
}

