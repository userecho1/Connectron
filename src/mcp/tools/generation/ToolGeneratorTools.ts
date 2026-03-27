import { z } from 'zod';
import { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolModule } from '../shared/ToolModule.js';
import { GenerateMcpToolUseCase } from '../../../application/usecases/tool-generator/index.js';

export const GENERATE_MCP_TOOL_TOOL_NAME = 'generate_mcp_tool';

const generateMcpToolInputSchema = z
  .object({
    service_method: z.string().min(1).describe('Service method reference, e.g. OrderService.createOrder.'),
    api_endpoint: z.string().optional().describe('Associated API endpoint, e.g. POST /orders.'),
    description: z.string().min(1).describe('Business description for the generated tool.'),
    tool_name: z.string().optional().describe('Optional explicit tool name in snake_case.'),
    bounded_context: z.string().optional().describe('Optional bounded context identifier.'),
    input_schema: z
      .object({
        type: z.literal('object'),
        properties: z.record(z.string(), z.object({ type: z.string(), description: z.string().optional() })),
        required: z.array(z.string()).optional(),
        additionalProperties: z.boolean(),
      })
      .optional()
      .describe('Optional schema to use in generation plan.'),
  })
  .strict();

export class ToolGeneratorTools implements ToolModule {
  constructor(private readonly generateMcpToolUseCase: GenerateMcpToolUseCase) {}

  listTools(): readonly Tool[] {
    return [
      {
        name: GENERATE_MCP_TOOL_TOOL_NAME,
        description:
          'Generate a dry-run MCP tool implementation plan, including interface, use case, adapter, and registration patch.',
        inputSchema: {
          type: 'object',
          properties: {
            service_method: { type: 'string', description: 'Service method reference, e.g. OrderService.createOrder.' },
            api_endpoint: { type: 'string', description: 'Associated API endpoint, e.g. POST /orders.' },
            description: { type: 'string', description: 'Business description for the generated tool.' },
            tool_name: { type: 'string', description: 'Optional explicit tool name in snake_case.' },
            bounded_context: { type: 'string', description: 'Optional bounded context identifier.' },
            input_schema: { type: 'object', description: 'Optional input schema for generation plan.' },
          },
          required: ['service_method', 'description'],
          additionalProperties: false,
        },
      },
    ];
  }

  async callTool(name: string, rawArgs: unknown): Promise<CallToolResult | null> {
    if (name !== GENERATE_MCP_TOOL_TOOL_NAME) {
      return null;
    }

    try {
      const args = generateMcpToolInputSchema.parse(rawArgs ?? {});
      const plan = await this.generateMcpToolUseCase.execute(args);

      return {
        content: [{ type: 'text', text: JSON.stringify(plan, null, 2) }],
        structuredContent: {
          analysis: 'Generated MCP tool plan in dry-run mode. No files were modified.',
          plan: [
            'Review generated files preview',
            'Review registration patch',
            'Approve and execute code generation in a controlled follow-up step',
          ],
          generated_code: [],
          generated_tools: [GENERATE_MCP_TOOL_TOOL_NAME],
          next_step: 'Run approved generation plan through implementation workflow and open PR.',
          dry_run_plan: plan,
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
