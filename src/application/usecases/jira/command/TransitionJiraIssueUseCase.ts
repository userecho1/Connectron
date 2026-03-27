import {
  JiraIssueReader,
  TransitionJiraIssueInput,
} from '../../../interfaces/IJiraProvider.js';

export class TransitionJiraIssueUseCase {
  constructor(private readonly jiraRepository: JiraIssueReader) {}

  async execute(input: TransitionJiraIssueInput): Promise<void> {
    if (!input.issueIdOrKey?.trim()) {
      throw new Error('issueIdOrKey is required');
    }
    if (!input.transitionId?.trim()) {
      throw new Error('transitionId is required');
    }

    await this.jiraRepository.transitionIssue({
      issueIdOrKey: input.issueIdOrKey.trim(),
      transitionId: input.transitionId.trim(),
      fields: input.fields,
    });
  }
}

