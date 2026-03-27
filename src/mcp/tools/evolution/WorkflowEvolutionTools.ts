import { z } from 'zod';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolModule } from '../shared/ToolModule.js';
import { WorkflowExecuteMonolithEvolutionUseCase } from '../../../application/usecases/workflow/index.js';

export const WORKFLOW_EXECUTE_MONOLITH_EVOLUTION_TOOL_NAME = 'workflow_execute_monolith_evolution';

const workflowInputSchema = z
  .object({
    projectRoot: z.string().min(1).describe('Root path of Java monolith project to analyze.'),
    scanDepth: z.number().int().min(1).max(20).optional(),
    includePackages: z.array(z.string().min(1)).optional(),
    excludePackages: z.array(z.string().min(1)).optional(),
    capabilityLimit: z.number().int().min(1).max(50).optional(),
    issueKey: z.string().optional().describe('Optional Jira issue key for commit and Jira plan templates.'),
    branchName: z.string().optional().describe('Optional branch name override.'),
    runDomainGenerator: z.boolean().optional().describe('Set true to include domain_mcp_generator dry-run output.'),
  })
  .strict();

export class WorkflowEvolutionTools implements ToolModule {
  constructor(private readonly workflowExecuteMonolithEvolutionUseCase: WorkflowExecuteMonolithEvolutionUseCase) {}

  listTools(): readonly Tool[] {
    return [
      {
        name: WORKFLOW_EXECUTE_MONOLITH_EVOLUTION_TOOL_NAME,
        description:
          'Execute end-to-end dry-run workflow for monolith evolution: analyze, extract, generate tool plans, and optional domain plans.',
        inputSchema: {
          type: 'object',
          properties: {
            projectRoot: { type: 'string', description: 'Root path of Java monolith project to analyze.' },
            scanDepth: { type: 'number', minimum: 1, maximum: 20 },
            includePackages: { type: 'array', items: { type: 'string' } },
            excludePackages: { type: 'array', items: { type: 'string' } },
            capabilityLimit: { type: 'number', minimum: 1, maximum: 50 },
            issueKey: { type: 'string' },
            branchName: { type: 'string' },
            runDomainGenerator: { type: 'boolean' },
          },
          required: ['projectRoot'],
          additionalProperties: false,
        },
      },
    ];
  }

  async callTool(name: string, rawArgs: unknown): Promise<unknown | null> {
    if (name !== WORKFLOW_EXECUTE_MONOLITH_EVOLUTION_TOOL_NAME) {
      return null;
    }

    try {
      const args = workflowInputSchema.parse(rawArgs ?? {});
      const result = await this.workflowExecuteMonolithEvolutionUseCase.execute(args);

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        structuredContent: {
          analysis: 'Executed dry-run monolith evolution workflow successfully.',
          plan: [
            'Review architecture and capabilities outputs',
            'Approve generatedToolPlans for implementation',
            'Use gitPlan and jiraPlan templates for operational rollout',
          ],
          generated_code: [],
          generated_tools: [WORKFLOW_EXECUTE_MONOLITH_EVOLUTION_TOOL_NAME],
          next_step: 'Approve selected plans and execute controlled implementation + PR flow.',
          workflow_result: result,
        },
      };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Error executing ${name}: ${error?.message || String(error)}` }],
      };
    }
  }
}
