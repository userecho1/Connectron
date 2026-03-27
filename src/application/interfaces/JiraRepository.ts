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

export interface AddJiraCommentInput {
  issueIdOrKey: string;
  body: string;
}

export interface AddJiraCommentResult {
  id: string;
  body: string;
}

export interface GetIssueTransitionsInput {
  issueIdOrKey: string;
}

export interface TransitionJiraIssueInput {
  issueIdOrKey: string;
  transitionId: string;
  fields?: Record<string, unknown>;
}

export interface UpdateJiraIssueFieldsInput {
  issueIdOrKey: string;
  fields: Record<string, unknown>;
}

export interface JiraIssueReader {
  searchIssues(input: SearchJiraIssuesInput): Promise<JiraIssue[]>;
  createTicket(input: CreateJiraTicketInput): Promise<CreateJiraTicketResult>;
  addComment(input: AddJiraCommentInput): Promise<AddJiraCommentResult>;
  getIssueTransitions(input: GetIssueTransitionsInput): Promise<unknown>;
  transitionIssue(input: TransitionJiraIssueInput): Promise<void>;
  updateIssueFields(input: UpdateJiraIssueFieldsInput): Promise<void>;
}
