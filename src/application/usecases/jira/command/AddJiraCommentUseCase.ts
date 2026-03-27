import {
  JiraIssueReader,
  AddJiraCommentInput,
  AddJiraCommentResult,
} from '../../../interfaces/IJiraProvider.js';

export class AddJiraCommentUseCase {
  constructor(private readonly jiraRepository: JiraIssueReader) {}

  async execute(input: AddJiraCommentInput): Promise<AddJiraCommentResult> {
    if (!input.issueIdOrKey?.trim()) {
      throw new Error('issueIdOrKey is required');
    }
    if (!input.body?.trim()) {
      throw new Error('comment body is required');
    }

    return this.jiraRepository.addComment({
      issueIdOrKey: input.issueIdOrKey.trim(),
      body: input.body.trim(),
    });
  }
}

