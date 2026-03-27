export interface SearchJiraIssuesInput {
  jql: string;
  maxResults?: number;
}

export interface JiraIssue {
  id: string;
  key: string;
  summary: string;
  status: string;
  assignee: string | null;
}

export interface CreateJiraTicketInput {
  projectKey: string;
  summary: string;
  description: string;
  issueType: string;
  assignee?: string;
  priority?: string;
}

export interface CreateJiraTicketResult {
  id: string;
  key: string;
  url: string;
}

export interface JiraIssueReader {
  searchIssues(input: SearchJiraIssuesInput): Promise<JiraIssue[]>;
  createTicket(input: CreateJiraTicketInput): Promise<CreateJiraTicketResult>;
}
