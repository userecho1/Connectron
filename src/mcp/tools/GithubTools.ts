import { z } from 'zod';
import { ListPullRequestsUseCase } from '../../application/usecases/ListPullRequestsUseCase';
import {
  PullRequestDirection,
  PullRequestSort,
  PullRequestState,
} from '../../application/interfaces/GithubRepository';
import { ToolModule } from './ToolModule';

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

export const LIST_PULL_REQUESTS_TOOL_NAME = 'list_pull_requests' as const;

export const listPullRequestsToolDefinition = {
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
} as const;

export class GithubTools implements ToolModule {
  constructor(private readonly listPullRequestsUseCase: ListPullRequestsUseCase) {}

  public listTools() {
    return [listPullRequestsToolDefinition];
  }

  public async callTool(name: string, rawArgs: unknown) {
    if (name !== LIST_PULL_REQUESTS_TOOL_NAME) {
      return null;
    }

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
      structuredContent: result,
    };
  }
}
