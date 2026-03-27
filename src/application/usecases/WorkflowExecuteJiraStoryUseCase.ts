import {
  JiraIssueReader,
  AddJiraCommentInput,
  TransitionJiraIssueInput,
  UpdateJiraIssueFieldsInput,
} from '../interfaces/IJiraProvider.js';

export interface WorkflowExecuteJiraStoryInput {
  issueIdOrKey: string;
  workReport: string;
  transitionId: string;
  fieldsToUpdate: Record<string, unknown>;
}

export interface WorkflowExecuteJiraStoryResult {
  commentId: string;
  transitioned: boolean;
  updatedFields: Record<string, unknown>;
}

export class WorkflowExecuteJiraStoryUseCase {
  constructor(private readonly jiraRepository: JiraIssueReader) {}

  async execute(input: WorkflowExecuteJiraStoryInput): Promise<WorkflowExecuteJiraStoryResult> {
    if (!input.issueIdOrKey?.trim()) {
      throw new Error('issueIdOrKey is required');
    }
    if (!input.workReport?.trim()) {
      throw new Error('workReport is required');
    }
    if (!input.transitionId?.trim()) {
      throw new Error('transitionId is required');
    }

    const comment = await this.jiraRepository.addComment({
      issueIdOrKey: input.issueIdOrKey.trim(),
      body: input.workReport.trim(),
    });

    await this.jiraRepository.transitionIssue({
      issueIdOrKey: input.issueIdOrKey.trim(),
      transitionId: input.transitionId.trim(),
      fields: input.fieldsToUpdate,
    });

    await this.jiraRepository.updateIssueFields({
      issueIdOrKey: input.issueIdOrKey.trim(),
      fields: input.fieldsToUpdate,
    });

    return {
      commentId: comment.id,
      transitioned: true,
      updatedFields: input.fieldsToUpdate,
    };
  }
}
