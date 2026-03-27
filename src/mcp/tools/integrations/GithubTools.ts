import { z } from 'zod';
import { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';
import {
  GetFileContentUseCase,
  ListPullRequestsUseCase,
  CreateOrUpdateFileUseCase,
  CreatePullRequestUseCase,
  MergePullRequestUseCase,
} from '../../../application/usecases/github';
import {
  PullRequestDirection,
  PullRequestSort,
  PullRequestState,
} from '../../../application/interfaces';
import { ToolModule } from '../shared/ToolModule';

const listPullRequestsInputSchema = z
  .object({
    owner: z.string().min(1).describe('Repository owner (organization or username).'),
    repo: z.string().min(1).describe('Repository name.'),
    state: z
      .enum(['open', 'closed', 'all'])
      .optional()
      .describe('Filter pull requests by state.'),
    sort: z
      .enum(['created', 'updated', 'popularity', 'long-running'])
      .optional()
      .describe('Sort field for pull requests.'),
    direction: z.enum(['asc', 'desc']).optional().describe('Sort direction.'),
    perPage: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe('Number of pull requests per page (1-100).'),
    page: z.number().int().min(1).optional().describe('Page number, starting from 1.'),
  })
  .strict();

const getFileContentInputSchema = z
  .object({
    owner: z.string().min(1).describe('Repository owner (organization or username).'),
    repo: z.string().min(1).describe('Repository name.'),
    path: z.string().min(1).describe('File path in repository.'),
    ref: z.string().optional().describe('Branch, tag, or commit hash.'),
  })
  .strict();

export const LIST_PULL_REQUESTS_TOOL_NAME = 'list_pull_requests' as const;
export const GET_FILE_CONTENT_TOOL_NAME = 'get_file_content' as const;

export const listPullRequestsToolDefinition: Tool = {
  name: LIST_PULL_REQUESTS_TOOL_NAME,
  description: 'List pull requests in a GitHub repository with filters and pagination.',
  inputSchema: {
    type: 'object',
    properties: {
      owner: { type: 'string', description: 'Repository owner (organization or username).' },
      repo: { type: 'string', description: 'Repository name.' },
      state: {
        type: 'string',
        enum: ['open', 'closed', 'all'],
        description: 'Filter pull requests by state.',
      },
      sort: {
        type: 'string',
        enum: ['created', 'updated', 'popularity', 'long-running'],
        description: 'Sort field for pull requests.',
      },
      direction: {
        type: 'string',
        enum: ['asc', 'desc'],
        description: 'Sort direction.',
      },
      perPage: {
        type: 'number',
        minimum: 1,
        maximum: 100,
        description: 'Number of pull requests per page.',
      },
      page: {
        type: 'number',
        minimum: 1,
        description: 'Page number, starting from 1.',
      },
    },
    required: ['owner', 'repo'],
    additionalProperties: false,
  },
};

export const getFileContentToolDefinition: Tool = {
  name: GET_FILE_CONTENT_TOOL_NAME,
  description: 'Retrieve the content of a file in a GitHub repository.',
  inputSchema: {
    type: 'object',
    properties: {
      owner: { type: 'string', description: 'Repository owner (organization or username).' },
      repo: { type: 'string', description: 'Repository name.' },
      path: { type: 'string', description: 'The file path in the repository.' },
      ref: { type: 'string', description: 'The commit/branch/tag to fetch from.', nullable: true },
    },
    required: ['owner', 'repo', 'path'],
    additionalProperties: false,
  },
};

export const CREATE_OR_UPDATE_FILE_TOOL_NAME = 'create_or_update_file' as const;
export const CREATE_PULL_REQUEST_TOOL_NAME = 'create_pull_request' as const;
export const MERGE_PULL_REQUEST_TOOL_NAME = 'merge_pull_request' as const;

const createOrUpdateFileInputSchema = z
  .object({
    owner: z.string().min(1).describe('Repository owner (organization or username).'),
    repo: z.string().min(1).describe('Repository name.'),
    path: z.string().min(1).describe('File path.'),
    message: z.string().min(1).describe('Commit message.'),
    content: z.string().min(1).describe('Base64 or UTF-8 content to write.'),
    sha: z.string().optional().describe('Existing file SHA for update.'),
    branch: z.string().optional().describe('Branch to write to.'),
    confirm: z.literal(true).describe('Explicit approval required for mutating GitHub operations.'),
  })
  .strict();

const createPullRequestInputSchema = z
  .object({
    owner: z.string().min(1).describe('Repository owner (organization or username).'),
    repo: z.string().min(1).describe('Repository name.'),
    title: z.string().min(1).describe('Pull request title.'),
    head: z.string().min(1).describe('Head branch.'),
    base: z.string().min(1).describe('Base branch.'),
    body: z.string().optional().describe('Pull request body text.'),
    confirm: z.literal(true).describe('Explicit approval required for mutating GitHub operations.'),
  })
  .strict();

const mergePullRequestInputSchema = z
  .object({
    owner: z.string().min(1).describe('Repository owner (organization or username).'),
    repo: z.string().min(1).describe('Repository name.'),
    pull_number: z.number().int().min(1).describe('Pull request number.'),
    commit_title: z.string().optional().describe('Merge commit title.'),
    commit_message: z.string().optional().describe('Merge commit message.'),
    merge_method: z
      .enum(['merge', 'squash', 'rebase'])
      .optional()
      .describe('Merge method.'),
    confirm: z.literal(true).describe('Explicit approval required for mutating GitHub operations.'),
  })
  .strict();

export class GithubTools implements ToolModule {
  constructor(
    private readonly listPullRequestsUseCase: ListPullRequestsUseCase,
    private readonly getFileContentUseCase: GetFileContentUseCase,
    private readonly createOrUpdateFileUseCase: CreateOrUpdateFileUseCase,
    private readonly createPullRequestUseCase: CreatePullRequestUseCase,
    private readonly mergePullRequestUseCase: MergePullRequestUseCase,
  ) {}

  public listTools(): readonly Tool[] {
    return [
      listPullRequestsToolDefinition,
      getFileContentToolDefinition,
      {
        name: CREATE_OR_UPDATE_FILE_TOOL_NAME,
        description: 'Create or update a file in GitHub repository using Base64 content.',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string' },
            repo: { type: 'string' },
            path: { type: 'string' },
            message: { type: 'string' },
            content: { type: 'string' },
            sha: { type: 'string' },
            branch: { type: 'string' },
            confirm: { type: 'boolean', enum: [true], description: 'Must be true to confirm write operation.' },
          },
          required: ['owner', 'repo', 'path', 'message', 'content', 'confirm'],
          additionalProperties: false,
        },
      },
      {
        name: CREATE_PULL_REQUEST_TOOL_NAME,
        description: 'Create a pull request on GitHub.',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string' },
            repo: { type: 'string' },
            title: { type: 'string' },
            head: { type: 'string' },
            base: { type: 'string' },
            body: { type: 'string' },
            confirm: { type: 'boolean', enum: [true], description: 'Must be true to confirm write operation.' },
          },
          required: ['owner', 'repo', 'title', 'head', 'base', 'confirm'],
          additionalProperties: false,
        },
      },
      {
        name: MERGE_PULL_REQUEST_TOOL_NAME,
        description: 'Merge an existing pull request on GitHub.',
        inputSchema: {
          type: 'object',
          properties: {
            owner: { type: 'string' },
            repo: { type: 'string' },
            pull_number: { type: 'number' },
            commit_title: { type: 'string' },
            commit_message: { type: 'string' },
            merge_method: { type: 'string', enum: ['merge', 'squash', 'rebase'] },
            confirm: { type: 'boolean', enum: [true], description: 'Must be true to confirm write operation.' },
          },
          required: ['owner', 'repo', 'pull_number', 'confirm'],
          additionalProperties: false,
        },
      },
    ];
  }

  public async callTool(name: string, rawArgs: unknown): Promise<CallToolResult | null> {
    try {
      if (name === LIST_PULL_REQUESTS_TOOL_NAME) {
      const input = listPullRequestsInputSchema.parse(rawArgs ?? {});

      const result = await this.listPullRequestsUseCase.execute({
        owner: input.owner,
        repo: input.repo,
        state: input.state as PullRequestState | undefined,
        sort: input.sort as PullRequestSort | undefined,
        direction: input.direction as PullRequestDirection | undefined,
        perPage: input.perPage,
        page: input.page,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
        structuredContent: result as unknown as Record<string, unknown>,
      };
    }

    if (name === GET_FILE_CONTENT_TOOL_NAME) {
      const input = getFileContentInputSchema.parse(rawArgs ?? {});

      const result = await this.getFileContentUseCase.execute({
        owner: input.owner,
        repo: input.repo,
        path: input.path,
        ref: input.ref,
      });

      return {
        content: [
          {
            type: 'text',
            text: result.content,
          },
        ],
        structuredContent: result as unknown as Record<string, unknown>,
      };
    }

    if (name === CREATE_OR_UPDATE_FILE_TOOL_NAME) {
      const input = createOrUpdateFileInputSchema.parse(rawArgs ?? {});
      const result = await this.createOrUpdateFileUseCase.execute({
        owner: input.owner,
        repo: input.repo,
        path: input.path,
        message: input.message,
        content: input.content,
        sha: input.sha,
        branch: input.branch,
      });

      return {
        content: [{ type: 'text', text: `File ${input.path} upserted with sha ${result.content.sha}` }],
        structuredContent: result as unknown as Record<string, unknown>,
      };
    }

    if (name === CREATE_PULL_REQUEST_TOOL_NAME) {
      const input = createPullRequestInputSchema.parse(rawArgs ?? {});
      const result = await this.createPullRequestUseCase.execute({
        owner: input.owner,
        repo: input.repo,
        title: input.title,
        head: input.head,
        base: input.base,
        body: input.body,
      });

      return {
        content: [{ type: 'text', text: `PR created: ${result.url}` }],
        structuredContent: result as unknown as Record<string, unknown>,
      };
    }

    if (name === MERGE_PULL_REQUEST_TOOL_NAME) {
      const input = mergePullRequestInputSchema.parse(rawArgs ?? {});
      const result = await this.mergePullRequestUseCase.execute({
        owner: input.owner,
        repo: input.repo,
        pull_number: input.pull_number,
        commit_title: input.commit_title,
        commit_message: input.commit_message,
        merge_method: input.merge_method,
      });

      return {
        content: [{ type: 'text', text: `PR merged: ${result.sha}, merged=${result.merged}` }],
        structuredContent: result as unknown as Record<string, unknown>,
      };
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

