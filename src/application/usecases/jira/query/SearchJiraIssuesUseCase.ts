import { JiraIssueReader, SearchJiraIssuesInput, JiraIssue } from '../../../interfaces';

export class SearchJiraIssuesUseCase {
  constructor(private readonly jiraReader: JiraIssueReader) {}

  async execute(input: SearchJiraIssuesInput): Promise<JiraIssue[]> {
    if (!input.jql || input.jql.trim() === '') {
      throw new Error('JQL query cannot be empty');
    }
    
    return this.jiraReader.searchIssues({
      jql: input.jql,
      maxResults: input.maxResults ?? 10
    });
  }
}


