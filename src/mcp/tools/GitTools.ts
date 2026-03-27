import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolModule } from './ToolModule.js';
import { GetGitInfoUseCase } from '../../application/usecases/GetGitInfoUseCase.js';

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
            },
          },
        },
      }
    ];
  }

  async callTool(name: string, rawArgs: unknown): Promise<unknown | null> {
    const args = (rawArgs as Record<string, unknown>) || {};
    const repoPath = args.repoPath ? String(args.repoPath) : undefined;

    switch (name) {
      case 'git_status': {
        const result = await this.getGitInfoUseCase.getStatus({ repoPath });
        return {
          content: [
            {
              type: 'text',
              text: result.output,
            },
          ],
        };
      }
      case 'git_log': {
        const maxCount = args.maxCount ? Number(args.maxCount) : undefined;
        const result = await this.getGitInfoUseCase.getLog({ repoPath, maxCount });
        return {
          content: [
            {
              type: 'text',
              text: result,
            },
          ],
        };
      }
      default:
        return null; // Tool not handled by this module
    }
  }
}
