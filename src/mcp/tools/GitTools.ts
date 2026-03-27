import { z } from 'zod';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolModule } from './ToolModule.js';
import { GetGitInfoUseCase } from '../../application/usecases/GetGitInfoUseCase.js';

const gitStatusInputSchema = z
  .object({
    repoPath: z.string().optional().describe('Optional path to the local git repository workspace. Defaults to process CWD.'),
  })
  .strict();

const gitLogInputSchema = z
  .object({
    repoPath: z.string().optional().describe('Optional path to the local git repository workspace. Defaults to process CWD.'),
    maxCount: z.number().int().min(1).optional().describe('Maximum number of commits to show.'),
  })
  .strict();

export class GitTools implements ToolModule {
  constructor(private readonly getGitInfoUseCase: GetGitInfoUseCase) {}

  listTools(): Tool[] {
    return [
      {
        name: 'git_status',
        description: 'Get the current git status (short format) of a repository.',
        inputSchema: {
          type: 'object',
          properties: {
            repoPath: {
              type: 'string',
              description: 'Optional path to the local git repository workspace. Defaults to process CWD.',
            },
          },
          additionalProperties: false,
        },
      },
      {
        name: 'git_log',
        description: 'Get recent git commit logs (oneline format).',
        inputSchema: {
          type: 'object',
          properties: {
            repoPath: {
              type: 'string',
              description: 'Optional path to the local git repository workspace. Defaults to process CWD.',
            },
            maxCount: {
              type: 'number',
              description: 'Maximum number of commits to show (default: 10).',
              minimum: 1,
            },
          },
          additionalProperties: false,
        },
      },
    ];
  }

  async callTool(name: string, rawArgs: unknown): Promise<unknown | null> {
    if (name === 'git_status') {
      const args = gitStatusInputSchema.parse(rawArgs ?? {});
      const result = await this.getGitInfoUseCase.getStatus({ repoPath: args.repoPath });
      return {
        content: [
          {
            type: 'text',
            text: result.output,
          },
        ],
        structuredContent: result,
      };
    }

    if (name === 'git_log') {
      const args = gitLogInputSchema.parse(rawArgs ?? {});
      const result = await this.getGitInfoUseCase.getLog({ repoPath: args.repoPath, maxCount: args.maxCount });
      return {
        content: [
          {
            type: 'text',
            text: result,
          },
        ],
        structuredContent: { log: result },
      };
    }

    return null;
  }
}
