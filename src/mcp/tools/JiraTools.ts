import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolModule } from './ToolModule.js';
import { SearchJiraIssuesUseCase } from '../../application/usecases/SearchJiraIssuesUseCase.js';

export class JiraTools implements ToolModule {
  constructor(private readonly searchJiraIssuesUseCase: SearchJiraIssuesUseCase) {}

  listTools(): Tool[] {
    return [
      {
        name: 'search_jira_issues',
        description: 'Search Jira for issues using a JQL (Jira Query Language) string. e.g. "project = PROJ AND status = \'In Progress\'"',
        inputSchema: {
          type: 'object',
          properties: {
            jql: {
              type: 'string',
              description: 'The JQL query to execute.',
            },
            maxResults: {
              type: 'number',
              description: 'Maximum number of results to fetch (default: 10)',
            },
          },
          required: ['jql'],
        },
      }
    ];
  }

  async callTool(name: string, rawArgs: unknown): Promise<unknown | null> {
    if (name !== 'search_jira_issues') {
      return null;
    }

    const args = rawArgs as Record<string, unknown>;

    const issues = await this.searchJiraIssuesUseCase.execute({
      jql: String(args.jql),
      maxResults: args.maxResults ? Number(args.maxResults) : undefined,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(issues, null, 2),
        },
      ],
    };
  }
}
