import { z } from 'zod';
import { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolModule } from './ToolModule';
import { ApprovalContext } from '../../security/approvalPolicy';

const configGitApprovalSchema = z
  .object({
    autoApprove: z.boolean().describe('True to auto-approve Git writes (turn off sampling), false to require sampling.'),
  })
  .strict();

export class SecurityTools implements ToolModule {
  constructor(private readonly context: ApprovalContext) {}

  listTools(): Tool[] {
    return [
      {
        name: 'config_git_auto_approve',
        description: 'Enable or disable automatic approval for Git write operations in the current session. If enabled, git writes will silently execute without sampling user confirmation.',
        inputSchema: {
          type: 'object',
          properties: {
            autoApprove: { type: 'boolean', description: 'True to bypass sampling for Git operations, false to require it.' },
          },
          required: ['autoApprove'],
          additionalProperties: false,
        },
      },
    ];
  }

  async callTool(name: string, rawArgs: unknown): Promise<CallToolResult | null> {
    if (name === 'config_git_auto_approve') {
      const args = configGitApprovalSchema.parse(rawArgs ?? {});
      this.context.gitAutoApprove = args.autoApprove;
      return {
        content: [
          {
            type: 'text',
            text: `Success: Git auto-approve (sampling bypass) has been set to ${args.autoApprove ? 'ON' : 'OFF'}.`,
          },
        ],
      };
    }
    return null;
  }
}
