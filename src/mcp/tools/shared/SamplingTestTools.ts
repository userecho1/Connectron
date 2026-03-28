import { z } from 'zod';
import { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ToolModule } from './ToolModule';

export const TEST_SAMPLING_TOOL_NAME = 'test_mcp_sampling';

const samplingInputSchema = z
  .object({
    prompt: z.string().min(1).describe('The prompt text you want to send back to the LLM client (host) for completion.'),
    maxTokens: z.number().int().min(1).max(1000).optional().describe('Maximum tokens for the sampled response.'),
  })
  .strict();

export class SamplingTestTools implements ToolModule {
  private server?: Server;

  public setServer(server: Server) {
    this.server = server;
  }

  listTools(): readonly Tool[] {
    return [
      {
        name: TEST_SAMPLING_TOOL_NAME,
        description:
          'Tests the MCP Sampling feature by sending a CreateMessageRequest from the server back to the client to generate an AI response.',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: { type: 'string', description: 'The prompt to send to the host LLM.' },
            maxTokens: { type: 'number', description: 'Maximum tokens to generate (optional).' },
          },
          required: ['prompt'],
          additionalProperties: false,
        },
      },
    ];
  }

  async callTool(name: string, rawArgs: unknown): Promise<CallToolResult | null> {
    if (name === TEST_SAMPLING_TOOL_NAME) {
      if (!this.server) {
        return {
          isError: true,
          content: [{ type: 'text', text: 'Server instance is not registered. Cannot perform sampling.' }],
        };
      }

      try {
        const args = samplingInputSchema.parse(rawArgs ?? {});
        
        // request sampling from the client
        const messageResult = await this.server.createMessage({
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: args.prompt
              }
            }
          ],
          maxTokens: args.maxTokens ?? 100,
        });

        const replyContent = messageResult.content;

        return {
          content: [
            {
              type: 'text',
              text: `Host client responded via sampling:\n\n${JSON.stringify(replyContent, null, 2)}`,
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [{ type: 'text', text: `Sampling request failed: ${error?.message || String(error)}` }],
        };
      }
    }
    return null;
  }
}
