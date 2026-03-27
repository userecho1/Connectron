import { z } from 'zod';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolModule } from '../shared/ToolModule.js';
import {
  GetGitStatusUseCase,
  GetGitLogUseCase,
  GitAddUseCase,
  GitCommitUseCase,
  GitPushUseCase,
  GitPullUseCase,
  GitCheckoutUseCase,
} from '../../../application/usecases/git/index.js';

const gitStatusInputSchema = z
  .object({
    repoPath: z.string().optional().describe('Optional path to the local git repository workspace. Falls back to GIT_REPO_ROOT when omitted.'),
  })
  .strict();

const gitLogInputSchema = z
  .object({
    repoPath: z.string().optional().describe('Optional path to the local git repository workspace. Falls back to GIT_REPO_ROOT when omitted.'),
    maxCount: z.number().int().min(1).optional().describe('Maximum number of commits to show.'),
  })
  .strict();

const gitAddInputSchema = z
  .object({
    repoPath: z.string().optional().describe('Optional local repo path.'),
    filePattern: z.string().optional().describe('File glob pattern to add (default .).'),
    confirm: z.literal(true).describe('Explicit approval required for mutating git operations.'),
  })
  .strict();

const gitCommitInputSchema = z
  .object({
    repoPath: z.string().optional().describe('Optional local repo path.'),
    message: z.string().min(1).describe('Commit message.'),
    confirm: z.literal(true).describe('Explicit approval required for mutating git operations.'),
  })
  .strict();

const gitPushInputSchema = z
  .object({
    repoPath: z.string().optional().describe('Optional local repo path.'),
    remote: z.string().optional().describe('Remote name, default origin.'),
    branch: z.string().optional().describe('Branch name, default main.'),
    confirm: z.literal(true).describe('Explicit approval required for mutating git operations.'),
  })
  .strict();

const gitPullInputSchema = z
  .object({
    repoPath: z.string().optional().describe('Optional local repo path.'),
    remote: z.string().optional().describe('Remote name, default origin.'),
    branch: z.string().optional().describe('Branch name, default main.'),
    confirm: z.literal(true).describe('Explicit approval required for mutating git operations.'),
  })
  .strict();

const gitCheckoutInputSchema = z
  .object({
    repoPath: z.string().optional().describe('Optional local repo path.'),
    branch: z.string().min(1).describe('Branch name to checkout.'),
    confirm: z.literal(true).describe('Explicit approval required for mutating git operations.'),
  })
  .strict();

export class GitTools implements ToolModule {
  constructor(
    private readonly getGitStatusUseCase: GetGitStatusUseCase,
    private readonly getGitLogUseCase: GetGitLogUseCase,
    private readonly gitAddUseCase: GitAddUseCase,
    private readonly gitCommitUseCase: GitCommitUseCase,
    private readonly gitPushUseCase: GitPushUseCase,
    private readonly gitPullUseCase: GitPullUseCase,
    private readonly gitCheckoutUseCase: GitCheckoutUseCase,
  ) {}

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
              description: 'Optional path to the local git repository workspace. Falls back to GIT_REPO_ROOT when omitted.',
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
              description: 'Optional path to the local git repository workspace. Falls back to GIT_REPO_ROOT when omitted.',
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
      {
        name: 'git_add',
        description: 'Stage files for commit in local git repository.',
        inputSchema: {
          type: 'object',
          properties: {
            repoPath: { type: 'string', description: 'Optional local repository path.' },
            filePattern: { type: 'string', description: 'File pattern to add e.g. ".".' },
            confirm: { type: 'boolean', enum: [true], description: 'Must be true to confirm write operation.' },
          },
          required: ['confirm'],
          additionalProperties: false,
        },
      },
      {
        name: 'git_commit',
        description: 'Commit staged changes in local git with message.',
        inputSchema: {
          type: 'object',
          properties: {
            repoPath: { type: 'string', description: 'Optional local repository path.' },
            message: { type: 'string', description: 'Commit message.' },
            confirm: { type: 'boolean', enum: [true], description: 'Must be true to confirm write operation.' },
          },
          required: ['message', 'confirm'],
          additionalProperties: false,
        },
      },
      {
        name: 'git_push',
        description: 'Push local branch to remote repository.',
        inputSchema: {
          type: 'object',
          properties: {
            repoPath: { type: 'string', description: 'Optional local repository path.' },
            remote: { type: 'string', description: 'Remote name.' },
            branch: { type: 'string', description: 'Branch name.' },
            confirm: { type: 'boolean', enum: [true], description: 'Must be true to confirm write operation.' },
          },
          required: ['confirm'],
          additionalProperties: false,
        },
      },
      {
        name: 'git_pull',
        description: 'Pull from remote branch into local repository.',
        inputSchema: {
          type: 'object',
          properties: {
            repoPath: { type: 'string', description: 'Optional local repository path.' },
            remote: { type: 'string', description: 'Remote name.' },
            branch: { type: 'string', description: 'Branch name.' },
            confirm: { type: 'boolean', enum: [true], description: 'Must be true to confirm write operation.' },
          },
          required: ['confirm'],
          additionalProperties: false,
        },
      },
      {
        name: 'git_checkout',
        description: 'Checkout a branch in local git repository.',
        inputSchema: {
          type: 'object',
          properties: {
            repoPath: { type: 'string', description: 'Optional local repository path.' },
            branch: { type: 'string', description: 'Branch name.' },
            confirm: { type: 'boolean', enum: [true], description: 'Must be true to confirm write operation.' },
          },
          required: ['branch', 'confirm'],
          additionalProperties: false,
        },
      },
    ];
  }

  async callTool(name: string, rawArgs: unknown): Promise<unknown | null> {
    try {
      if (name === 'git_status') {
      const args = gitStatusInputSchema.parse(rawArgs ?? {});
      const result = await this.getGitStatusUseCase.execute({ repoPath: args.repoPath });
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
      const result = await this.getGitLogUseCase.execute({ repoPath: args.repoPath, maxCount: args.maxCount });
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

    if (name === 'git_add') {
      const args = gitAddInputSchema.parse(rawArgs ?? {});
      const result = await this.gitAddUseCase.execute({ repoPath: args.repoPath, filePattern: args.filePattern });
      return { content: [{ type: 'text', text: result }], structuredContent: { added: true, output: result } };
    }

    if (name === 'git_commit') {
      const args = gitCommitInputSchema.parse(rawArgs ?? {});
      const result = await this.gitCommitUseCase.execute({ repoPath: args.repoPath, message: args.message });
      return { content: [{ type: 'text', text: result }], structuredContent: { committed: true, output: result } };
    }

    if (name === 'git_push') {
      const args = gitPushInputSchema.parse(rawArgs ?? {});
      const result = await this.gitPushUseCase.execute({ repoPath: args.repoPath, remote: args.remote, branch: args.branch });
      return { content: [{ type: 'text', text: result }], structuredContent: { pushed: true, output: result } };
    }

    if (name === 'git_pull') {
      const args = gitPullInputSchema.parse(rawArgs ?? {});
      const result = await this.gitPullUseCase.execute({ repoPath: args.repoPath, remote: args.remote, branch: args.branch });
      return { content: [{ type: 'text', text: result }], structuredContent: { pulled: true, output: result } };
    }

    if (name === 'git_checkout') {
      const args = gitCheckoutInputSchema.parse(rawArgs ?? {});
      const result = await this.gitCheckoutUseCase.execute({ repoPath: args.repoPath, branch: args.branch });
      return { content: [{ type: 'text', text: result }], structuredContent: { checkedOut: args.branch, output: result } };
    }

    return null;
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Error executing ${name}: ${error?.message || String(error)}` }],
      };
    }
  }
}
