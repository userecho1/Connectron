import { AnalyzeJavaProjectUseCase } from '../../java-analysis/query/AnalyzeJavaProjectUseCase';
import { ExtractCapabilitiesUseCase } from '../../capability-extractor/query/ExtractCapabilitiesUseCase';
import { GenerateMcpToolUseCase } from '../../tool-generator/command/GenerateMcpToolUseCase';
import { GenerateDomainMcpServersUseCase } from '../../domain-mcp-generator/command/GenerateDomainMcpServersUseCase';

export interface WorkflowExecuteMonolithEvolutionInput {
  projectRoot: string;
  scanDepth?: number;
  includePackages?: string[];
  excludePackages?: string[];
  capabilityLimit?: number;
  issueKey?: string;
  branchName?: string;
  runDomainGenerator?: boolean;
}

export interface WorkflowExecuteMonolithEvolutionResult {
  architecture: unknown;
  capabilities: unknown;
  generatedToolPlans: unknown[];
  domainPlan?: unknown;
  gitPlan: {
    branch: string;
    commitMessageTemplate: string;
    prTitle: string;
    prDescriptionTemplate: string;
  };
  jiraPlan?: {
    issueKey: string;
    commentTemplate: string;
  };
}

export class WorkflowExecuteMonolithEvolutionUseCase {
  constructor(
    private readonly analyzeJavaProjectUseCase: AnalyzeJavaProjectUseCase,
    private readonly extractCapabilitiesUseCase: ExtractCapabilitiesUseCase,
    private readonly generateMcpToolUseCase: GenerateMcpToolUseCase,
    private readonly generateDomainMcpServersUseCase: GenerateDomainMcpServersUseCase,
  ) {}

  async execute(
    input: WorkflowExecuteMonolithEvolutionInput,
  ): Promise<WorkflowExecuteMonolithEvolutionResult> {
    if (!input.projectRoot?.trim()) {
      throw new Error('projectRoot is required');
    }

    const architecture = await this.analyzeJavaProjectUseCase.execute({
      projectRoot: input.projectRoot,
      scanDepth: input.scanDepth,
      includePackages: input.includePackages,
      excludePackages: input.excludePackages,
    });

    const capabilities = await this.extractCapabilitiesUseCase.execute({ report: architecture });

    const capabilityLimit = Math.max(1, input.capabilityLimit ?? 5);
    const selectedCapabilities = capabilities.capabilities.slice(0, capabilityLimit);

    const generatedToolPlans = await Promise.all(
      selectedCapabilities.map((capability) =>
        this.generateMcpToolUseCase.execute({
          service_method: capability.source.serviceMethod || capability.source.controllerClass || capability.name,
          api_endpoint: capability.source.path,
          description: capability.description,
          tool_name: capability.name,
          bounded_context: capability.bounded_context,
          input_schema: capability.input_schema,
        }),
      ),
    );

    let domainPlan: unknown;
    if (input.runDomainGenerator) {
      domainPlan = await this.generateDomainMcpServersUseCase.execute({
        report: architecture,
        capabilities: capabilities.capabilities,
        confirm: true,
      });
    }

    const branchName =
      input.branchName ||
      `feature_${(input.issueKey || 'auto').toLowerCase()}_monolith_evolution`;

    const commitPrefix = input.issueKey ? `${input.issueKey} ` : '';

    const gitPlan = {
      branch: branchName,
      commitMessageTemplate: `${commitPrefix}feat: bootstrap connectron monolith evolution dry-run plans`,
      prTitle: `${commitPrefix}feat: add monolith evolution workflow plans`,
      prDescriptionTemplate:
        '## Summary\\n- Analyze Java monolith architecture\\n- Extract capabilities\\n- Generate MCP tool dry-run plans\\n- Generate domain MCP dry-run plans (optional)\\n\\n## Validation\\n- npx tsc --noEmit',
    };

    const jiraPlan = input.issueKey
      ? {
          issueKey: input.issueKey,
          commentTemplate:
            'Automated dry-run completed: architecture analysis, capability extraction, tool generation plans, and optional domain plans are ready for review.',
        }
      : undefined;

    return {
      architecture,
      capabilities,
      generatedToolPlans,
      domainPlan,
      gitPlan,
      jiraPlan,
    };
  }
}
