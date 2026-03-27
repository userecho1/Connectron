import {
  JiraIssueReader,
  UpdateJiraIssueFieldsInput,
} from '../../../interfaces/IJiraProvider.js';

export class UpdateJiraIssueFieldsUseCase {
  constructor(private readonly jiraRepository: JiraIssueReader) {}

  async execute(input: UpdateJiraIssueFieldsInput): Promise<void> {
    if (!input.issueIdOrKey?.trim()) {
      throw new Error('issueIdOrKey is required');
    }
    if (!input.fields || Object.keys(input.fields).length === 0) {
      throw new Error('fields is required to update issue');
    }

    await this.jiraRepository.updateIssueFields({
      issueIdOrKey: input.issueIdOrKey.trim(),
      fields: input.fields,
    });
  }
}

