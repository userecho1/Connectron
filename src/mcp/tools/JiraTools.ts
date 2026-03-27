import { z } from 'zod';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolModule } from './ToolModule.js';
import { SearchJiraIssuesUseCase } from '../../application/usecases/SearchJiraIssuesUseCase.js';
import { CreateTicketUseCase } from '../../application/usecases/CreateTicketUseCase.js';

const searchJiraIssuesInputSchema = z
  .object({
    jql: z.string().min(1).describe('The JQL query to execute.'),
    maxResults: z.number().int().min(1).max(100).optional().describe('Maximum number of results to fetch.'),
  })
  .strict();

const createTicketInputSchema = z
  .object({
    projectKey: z.string().min(1).describe('Jira project key.'),
    summary: z.string().min(1).describe('Issue summary.'),
    description: z.string().min(1).describe('Issue description.'),
    issueType: z.string().min(1).describe('Issue type name (e.g. Task, Bug).'),
    assignee: z.string().optional().describe('Assignee username.'),
    priority: z.string().optional().describe('Priority name.'),
  })
  .strict();

export class JiraTools implements ToolModule {
  constructor(
    private readonly searchJiraIssuesUseCase: SearchJiraIssuesUseCase,
    private readonly createTicketUseCase: CreateTicketUseCase,
  ) {}

  listTools(): Tool[] {
    return [
      {
        name: 'search_jira_issues',
        description:
          "Search Jira for issues using a JQL (Jira Query Language) string. e.g. 'project = PROJ AND status = \'In Progress\''",
        inputSchema: {
          type: 'object',
          properties: {
            jql: { type: 'string', description: 'The JQL query to execute.' },
            maxResults: {
              type: 'number',
              description: 'Maximum number of results to fetch (default: 10)',
            },
          },
          required: ['jql'],
          additionalProperties: false,
        },
      },
      {
        name: 'create_ticket',
        description: 'Create a Jira ticket with project key, summary, description, and issue type.',
        inputSchema: {
          type: 'object',
          properties: {
            projectKey: { type: 'string', description: 'Jira project key.' },
            summary: { type: 'string', description: 'Issue summary.' },
            description: { type: 'string', description: 'Issue description.' },
            issueType: { type: 'string', description: 'Issue type name.' },
            assignee: { type: 'string', description: 'Assignee username.' },
            priority: { type: 'string', description: 'Priority name (e.g. High).' },
          },
          required: ['projectKey', 'summary', 'description', 'issueType'],
          additionalProperties: false,
        },
      },
    ];
  }

  async callTool(name: string, rawArgs: unknown): Promise<unknown | null> {
    if (name === 'search_jira_issues') {
      const args = searchJiraIssuesInputSchema.parse(rawArgs ?? {});

      const issues = await this.searchJiraIssuesUseCase.execute({
        jql: args.jql,
        maxResults: args.maxResults,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(issues, null, 2),
          },
        ],
        structuredContent: issues,
      };
    }

    if (name === 'create_ticket') {
      const args = createTicketInputSchema.parse(rawArgs ?? {});

      const result = await this.createTicketUseCase.execute({
        projectKey: args.projectKey,
        summary: args.summary,
        description: args.description,
        issueType: args.issueType,
        assignee: args.assignee,
        priority: args.priority,
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

    return null;
  }
}
