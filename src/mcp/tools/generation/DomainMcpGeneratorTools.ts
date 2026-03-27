import { z } from 'zod';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolModule } from '../shared/ToolModule.js';
import { GenerateDomainMcpServersUseCase } from '../../../application/usecases/domain-mcp-generator/index.js';

export const DOMAIN_MCP_GENERATOR_TOOL_NAME = 'domain_mcp_generator';

const projectArchitectureReportSchema = z
  .object({
    modules: z.array(z.string()),
    api_list: z.array(
      z.object({
        controllerClass: z.string(),
        httpMethod: z.string(),
        path: z.string(),
        methodName: z.string(),
        inputType: z.string().optional(),
        returnType: z.string().optional(),
        serviceCalls: z.array(z.string()),
      }),
    ),
    services: z.array(
      z.object({
        serviceClass: z.string(),
        methodName: z.string(),
        parameters: z.array(z.string()),
        returnType: z.string().optional(),
        repositoryCalls: z.array(z.string()),
      }),
    ),
    entities: z.array(z.string()),
    database_tables: z.array(z.string()),
    dependencies: z.array(z.string()),
    bounded_context_hints: z.array(z.string()),
    scanned_files: z.number().int().nonnegative(),
    warnings: z.array(z.string()),
  })
  .strict();

const capabilityCandidateSchema = z
  .object({
    name: z.string(),
    description: z.string(),
    source: z.object({
      controllerClass: z.string().optional(),
      serviceMethod: z.string().optional(),
      httpMethod: z.string().optional(),
      path: z.string().optional(),
    }),
    input_schema: z.object({
      type: z.literal('object'),
      properties: z.record(z.string(), z.object({ type: z.string(), description: z.string().optional() })),
      required: z.array(z.string()).optional(),
      additionalProperties: z.boolean(),
    }),
    bounded_context: z.string(),
  })
  .strict();

const domainMcpGeneratorInputSchema = z
  .object({
    report: projectArchitectureReportSchema,
    capabilities: z.array(capabilityCandidateSchema),
    domains: z.array(z.string()).optional().describe('Optional specific domains to generate.'),
    confirm: z.literal(true).describe('Manual confirmation flag. Must be true to run.'),
  })
  .strict();

export class DomainMcpGeneratorTools implements ToolModule {
  constructor(private readonly generateDomainMcpServersUseCase: GenerateDomainMcpServersUseCase) {}

  listTools(): readonly Tool[] {
    return [
      {
        name: DOMAIN_MCP_GENERATOR_TOOL_NAME,
        description: 'Generate dry-run plans for bounded-context domain MCP servers. Manual trigger only.',
        inputSchema: {
          type: 'object',
          properties: {
            report: { type: 'object', description: 'ProjectArchitectureReport from analyze_java_project.' },
            capabilities: { type: 'array', description: 'Capability candidates from extract_capabilities.' },
            domains: { type: 'array', items: { type: 'string' }, description: 'Optional domains to include.' },
            confirm: { type: 'boolean', enum: [true], description: 'Must be true to confirm manual trigger.' },
          },
          required: ['report', 'capabilities', 'confirm'],
          additionalProperties: false,
        },
      },
    ];
  }

  async callTool(name: string, rawArgs: unknown): Promise<unknown | null> {
    if (name !== DOMAIN_MCP_GENERATOR_TOOL_NAME) {
      return null;
    }

    try {
      const args = domainMcpGeneratorInputSchema.parse(rawArgs ?? {});
      const result = await this.generateDomainMcpServersUseCase.execute(args);

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        structuredContent: {
          analysis: 'Generated bounded-context domain MCP server plans in dry-run mode.',
          plan: [
            'Review generated_servers grouping',
            'Validate domain boundaries with architects',
            'Execute approved scaffolding in follow-up step',
          ],
          generated_code: [],
          generated_tools: [DOMAIN_MCP_GENERATOR_TOOL_NAME],
          next_step: 'Approve domain plans and run controlled scaffold generation per domain.',
          dry_run_plan: result,
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
