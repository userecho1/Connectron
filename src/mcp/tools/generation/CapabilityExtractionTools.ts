import { z } from 'zod';
import { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolModule } from '../shared/ToolModule.js';
import { ExtractCapabilitiesUseCase } from '../../../application/usecases/capability-extractor/index.js';

export const EXTRACT_CAPABILITIES_TOOL_NAME = 'extract_capabilities';

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

const extractCapabilitiesInputSchema = z
  .object({
    report: projectArchitectureReportSchema,
  })
  .strict();

export class CapabilityExtractionTools implements ToolModule {
  constructor(private readonly extractCapabilitiesUseCase: ExtractCapabilitiesUseCase) {}

  listTools(): readonly Tool[] {
    return [
      {
        name: EXTRACT_CAPABILITIES_TOOL_NAME,
        description: 'Extract MCP capability candidates from a Java project architecture report.',
        inputSchema: {
          type: 'object',
          properties: {
            report: {
              type: 'object',
              description: 'ProjectArchitectureReport produced by analyze_java_project.',
            },
          },
          required: ['report'],
          additionalProperties: false,
        },
      },
    ];
  }

  async callTool(name: string, rawArgs: unknown): Promise<CallToolResult | null> {
    if (name !== EXTRACT_CAPABILITIES_TOOL_NAME) {
      return null;
    }

    try {
      const args = extractCapabilitiesInputSchema.parse(rawArgs ?? {});
      const result = await this.extractCapabilitiesUseCase.execute(args);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
        structuredContent: {
          analysis: 'Capabilities extracted from Java architecture report using REST and method semantics.',
          plan: [
            'Review conflicts and bounded_contexts',
            'Select capability subset for generation',
            'Run generate_mcp_tool in dry-run mode',
          ],
          generated_code: [],
          generated_tools: [EXTRACT_CAPABILITIES_TOOL_NAME],
          next_step: 'Use generate_mcp_tool with selected capabilities to produce implementation plan.',
          result,
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
