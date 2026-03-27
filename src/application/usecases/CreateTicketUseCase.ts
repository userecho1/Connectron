import {
  CreateJiraTicketInput,
  CreateJiraTicketResult,
  JiraIssueReader,
} from '../interfaces/JiraRepository.js';

export class CreateTicketUseCase {
  constructor(private readonly jiraRepository: JiraIssueReader) {}

  async execute(input: CreateJiraTicketInput): Promise<CreateJiraTicketResult> {
    if (!input.projectKey || !input.projectKey.trim()) {
      throw new Error('projectKey is required');
    }
    if (!input.summary || !input.summary.trim()) {
      throw new Error('summary is required');
    }
    if (!input.description || !input.description.trim()) {
      throw new Error('description is required');
    }
    if (!input.issueType || !input.issueType.trim()) {
      throw new Error('issueType is required');
    }

    return this.jiraRepository.createTicket({
      projectKey: input.projectKey.trim(),
      summary: input.summary.trim(),
      description: input.description.trim(),
      issueType: input.issueType.trim(),
      assignee: input.assignee?.trim(),
      priority: input.priority?.trim(),
    });
  }
}
