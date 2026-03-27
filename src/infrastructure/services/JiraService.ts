import { JiraIssueReader, SearchJiraIssuesInput, JiraIssue } from '../../application/interfaces/JiraRepository.js';
import { env } from '../../config/env.js';

export class JiraService implements JiraIssueReader {
  private readonly baseUrl: string;
  private readonly email: string;
  private readonly apiToken: string;

  constructor(baseUrl: string, email: string, apiToken: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.email = email;
    this.apiToken = apiToken;
  }

  async searchIssues(input: SearchJiraIssuesInput): Promise<JiraIssue[]> {
    const url = new URL(`${this.baseUrl}/rest/api/3/search`);
    url.searchParams.append('jql', input.jql);
    url.searchParams.append('maxResults', (input.maxResults || 10).toString());
    url.searchParams.append('fields', 'summary,status,assignee');

    const auth = Buffer.from(`${this.email}:${this.apiToken}`).toString('base64');

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Jira API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as any;

    if (!data.issues || !Array.isArray(data.issues)) {
      return [];
    }

    return data.issues.map((issue: any) => ({
      id: issue.id,
      key: issue.key,
      summary: issue.fields?.summary || 'No Summary',
      status: issue.fields?.status?.name || 'Unknown',
      assignee: issue.fields?.assignee?.displayName || null
    }));
  }
}

export function buildJiraServiceFromEnv(): JiraService {
  if (!env.JIRA_HOST || !env.JIRA_EMAIL || !env.JIRA_API_TOKEN) {
    throw new Error('JIRA_HOST, JIRA_EMAIL, and JIRA_API_TOKEN must be provided to enable Jira module.');
  }

  return new JiraService(env.JIRA_HOST, env.JIRA_EMAIL, env.JIRA_API_TOKEN);
}
