import { Version2Client as JiraClient } from 'jira.js';
import {
  JiraIssueReader,
  SearchJiraIssuesInput,
  JiraIssue,
  CreateJiraTicketInput,
  CreateJiraTicketResult,
  AddJiraCommentInput,
  AddJiraCommentResult,
  GetIssueTransitionsInput,
  TransitionJiraIssueInput,
  UpdateJiraIssueFieldsInput,
} from '../../../application/interfaces';
import { env } from '../../../config/env.js';

export class JiraService implements JiraIssueReader {
  private readonly client: InstanceType<typeof JiraClient>;

  constructor(private readonly baseUrl: string, private readonly email: string, private readonly apiToken: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');

    this.client = new JiraClient({
      host: this.baseUrl,
      authentication: {
        basic: {
          email: this.email,
          apiToken: this.apiToken,
        },
      },
    });
  }

  async searchIssues(input: SearchJiraIssuesInput): Promise<JiraIssue[]> {
    const result = await this.client.issueSearch.searchForIssuesUsingJql({
      jql: input.jql,
      maxResults: input.maxResults ?? 10,
      fields: ['summary', 'status', 'assignee'],
    });

    if (!result.issues || !Array.isArray(result.issues)) {
      return [];
    }

    return result.issues.map((issue: any) => ({
      id: issue.id,
      key: issue.key,
      summary: issue.fields?.summary || 'No Summary',
      status: issue.fields?.status?.name || 'Unknown',
      assignee: issue.fields?.assignee?.displayName || null,
    }));
  }

  async createTicket(input: CreateJiraTicketInput): Promise<CreateJiraTicketResult> {
    const response = await this.client.issues.createIssue({
      fields: {
        project: {
          key: input.projectKey,
        },
        summary: input.summary,
        description: input.description,
        issuetype: {
          name: input.issueType,
        },
        ...(input.assignee ? { assignee: { name: input.assignee } } : {}),
        ...(input.priority ? { priority: { name: input.priority } } : {}),
      },
    });

    return {
      id: response.id,
      key: response.key,
      url: `${this.baseUrl}/browse/${response.key}`,
    };
  }

  async addComment(input: AddJiraCommentInput): Promise<AddJiraCommentResult> {
    const result = await this.client.issueComments.addComment({
      issueIdOrKey: input.issueIdOrKey,
      comment: input.body,
    });

    return {
      id: (result as any).id,
      body: input.body,
    };
  }

  async getIssueTransitions(input: GetIssueTransitionsInput): Promise<unknown> {
    return this.client.issues.getTransitions({
      issueIdOrKey: input.issueIdOrKey,
      expand: 'transitions.fields',
    });
  }

  async transitionIssue(input: TransitionJiraIssueInput): Promise<void> {
    await this.client.issues.doTransition({
      issueIdOrKey: input.issueIdOrKey,
      transition: { id: input.transitionId },
      fields: input.fields,
    });
  }

  async updateIssueFields(input: UpdateJiraIssueFieldsInput): Promise<void> {
    await this.client.issues.editIssue({
      issueIdOrKey: input.issueIdOrKey,
      fields: input.fields,
      returnIssue: false,
    });
  }
}

export function buildJiraServiceFromEnv(): JiraService {
  if (!env.JIRA_HOST || !env.JIRA_EMAIL || !env.JIRA_API_TOKEN) {
    throw new Error('JIRA_HOST, JIRA_EMAIL, and JIRA_API_TOKEN must be provided to enable Jira module.');
  }

  return new JiraService(env.JIRA_HOST, env.JIRA_EMAIL, env.JIRA_API_TOKEN);
}

