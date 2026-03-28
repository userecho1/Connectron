import { z } from 'zod';
import { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolModule } from '../shared/ToolModule';
import {
  SearchJiraIssuesUseCase,
  CreateTicketUseCase,
  AddJiraCommentUseCase,
  TransitionJiraIssueUseCase,
  UpdateJiraIssueFieldsUseCase,
} from '../../../application/usecases/jira/index';
import { WorkflowExecuteJiraStoryUseCase } from '../../../application/usecases/workflow/index';

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
    confirm: z.literal(true).describe('Explicit approval required for mutating Jira operations.'),
  })
  .strict();

const addCommentInputSchema = z
  .object({
    issueIdOrKey: z.string().min(1).describe('Jira issue ID or key.'),
    body: z.string().min(1).describe('Comment body text.'),
    confirm: z.literal(true).describe('Explicit approval required for mutating Jira operations.'),
  })
  .strict();

const transitionIssueInputSchema = z
  .object({
    issueIdOrKey: z.string().min(1).describe('Jira issue ID or key.'),
    transitionId: z.string().min(1).describe('Transition ID to move issue status.'),
    fields: z.record(z.string(), z.any()).optional().describe('Optional fields to set during transition.'),
    confirm: z.literal(true).describe('Explicit approval required for mutating Jira operations.'),
  })
  .strict();

const updateIssueFieldsInputSchema = z
  .object({
    issueIdOrKey: z.string().min(1).describe('Jira issue ID or key.'),
    fields: z
      .record(z.string(), z.any())
      .refine((v) => Object.keys(v).length > 0, {
        message: 'fields must contain at least one field to update.',
      })
      .describe('Issue fields to update, e.g. assignee, custom fields.'),
    confirm: z.literal(true).describe('Explicit approval required for mutating Jira operations.'),
  })
  .strict();

const workflowExecuteJiraStoryInputSchema = z
  .object({
    issueIdOrKey: z.string().min(1).describe('Jira issue ID or key.'),
    workReport: z.string().min(1).describe('Work report comment.'),
    transitionId: z.string().min(1).describe('Transition id for Jira workflow.'),
    fieldsToUpdate: z.record(z.string(), z.any()).describe('Fields to update on issue.'),
    confirm: z.literal(true).describe('Explicit approval required for mutating Jira operations.'),
  })
  .strict();

export class JiraTools implements ToolModule {
  constructor(
    private readonly searchJiraIssuesUseCase: SearchJiraIssuesUseCase,
    private readonly createTicketUseCase: CreateTicketUseCase,
    private readonly addJiraCommentUseCase: AddJiraCommentUseCase,
    private readonly transitionJiraIssueUseCase: TransitionJiraIssueUseCase,
    private readonly updateJiraIssueFieldsUseCase: UpdateJiraIssueFieldsUseCase,
    private readonly workflowExecuteJiraStoryUseCase: WorkflowExecuteJiraStoryUseCase,
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
            confirm: { type: 'boolean', enum: [true], description: 'Must be true to confirm write operation.' },
          },
          required: ['projectKey', 'summary', 'description', 'issueType', 'confirm'],
          additionalProperties: false,
        },
      },
      {
        name: 'add_jira_comment',
        description: 'Add a comment to a Jira issue (for work report and notes).',
        inputSchema: {
          type: 'object',
          properties: {
            issueIdOrKey: { type: 'string', description: 'Jira issue id or key.' },
            body: { type: 'string', description: 'Comment text.' },
            confirm: { type: 'boolean', enum: [true], description: 'Must be true to confirm write operation.' },
          },
          required: ['issueIdOrKey', 'body', 'confirm'],
          additionalProperties: false,
        },
      },
      {
        name: 'transition_jira_issue',
        description: 'Transition a Jira issue to another workflow status.',
        inputSchema: {
          type: 'object',
          properties: {
            issueIdOrKey: { type: 'string', description: 'Jira issue id or key.' },
            transitionId: { type: 'string', description: 'Transition id to apply.' },
            fields: {
              type: 'object',
              description: 'Optional fields to set while transitioning e.g. custom fields.',
              additionalProperties: true,
            },
            confirm: { type: 'boolean', enum: [true], description: 'Must be true to confirm write operation.' },
          },
          required: ['issueIdOrKey', 'transitionId', 'confirm'],
          additionalProperties: false,
        },
      },
      {
        name: 'update_jira_issue_fields',
        description: 'Update Jira issue fields such as start/end dates, AC, code review status.',
        inputSchema: {
          type: 'object',
          properties: {
            issueIdOrKey: { type: 'string', description: 'Jira issue id or key.' },
            fields: {
              type: 'object',
              description: 'Fields to update in issue e.g. startDate, dueDate, customfield_XXXX.',
              additionalProperties: true,
            },
            confirm: { type: 'boolean', enum: [true], description: 'Must be true to confirm write operation.' },
          },
          required: ['issueIdOrKey', 'fields', 'confirm'],
          additionalProperties: false,
        },
      },
      {
        name: 'workflow_execute_jira_story',
        description: 'Execute a single workflow: comment, transition, and update issue fields in Jira.',
        inputSchema: {
          type: 'object',
          properties: {
            issueIdOrKey: { type: 'string', description: 'Jira issue id or key.' },
            workReport: { type: 'string', description: 'Work report to add as comment.' },
            transitionId: { type: 'string', description: 'Transition id to apply.' },
            fieldsToUpdate: {
              type: 'object',
              description: 'Fields map to update on issue.',
              additionalProperties: true,
            },
            confirm: { type: 'boolean', enum: [true], description: 'Must be true to confirm write operation.' },
          },
          required: ['issueIdOrKey', 'workReport', 'transitionId', 'fieldsToUpdate', 'confirm'],
          additionalProperties: false,
        },
      }
    ];
  }

  async callTool(name: string, rawArgs: unknown): Promise<CallToolResult | null> {
    try {
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
        structuredContent: { issues },
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
        structuredContent: result as unknown as Record<string, unknown>,
      };
    }

    if (name === 'add_jira_comment') {
      const args = addCommentInputSchema.parse(rawArgs ?? {});

      const result = await this.addJiraCommentUseCase.execute({
        issueIdOrKey: args.issueIdOrKey,
        body: args.body,
      });

      return {
        content: [
          {
            type: 'text',
            text: 'Comment added successfully',
          },
        ],
        structuredContent: result as unknown as Record<string, unknown>,
      };
    }

    if (name === 'transition_jira_issue') {
      const args = transitionIssueInputSchema.parse(rawArgs ?? {});

      await this.transitionJiraIssueUseCase.execute({
        issueIdOrKey: args.issueIdOrKey,
        transitionId: args.transitionId,
        fields: args.fields,
      });

      return {
        content: [
          {
            type: 'text',
            text: `Issue ${args.issueIdOrKey} transitioned via ${args.transitionId}.`,
          },
        ],
        structuredContent: { issueIdOrKey: args.issueIdOrKey, transitioned: true },
      };
    }

    if (name === 'update_jira_issue_fields') {
      const args = updateIssueFieldsInputSchema.parse(rawArgs ?? {});

      await this.updateJiraIssueFieldsUseCase.execute({
        issueIdOrKey: args.issueIdOrKey,
        fields: args.fields,
      });

      return {
        content: [
          {
            type: 'text',
            text: `Issue ${args.issueIdOrKey} fields updated successfully.`,
          },
        ],
        structuredContent: { issueIdOrKey: args.issueIdOrKey, updatedFields: args.fields },
      };
    }

    if (name === 'workflow_execute_jira_story') {
      const args = workflowExecuteJiraStoryInputSchema.parse(rawArgs ?? {});

      const result = await this.workflowExecuteJiraStoryUseCase.execute({
        issueIdOrKey: args.issueIdOrKey,
        workReport: args.workReport,
        transitionId: args.transitionId,
        fieldsToUpdate: args.fieldsToUpdate,
      });

      return {
        content: [
          {
            type: 'text',
            text: `Workflow executed for issue ${args.issueIdOrKey}. comment=${result.commentId}, transitioned=${result.transitioned}.`,
          },
        ],
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
