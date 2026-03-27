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

export interface JiraIssueReader {
  searchIssues(input: SearchJiraIssuesInput): Promise<JiraIssue[]>;
}
