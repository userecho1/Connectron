import { GetPromptResult, Prompt } from '@modelcontextprotocol/sdk/types.js';
import { PromptModule } from './PromptModule';

export class TaskPrompts implements PromptModule {
  listPrompts(): Prompt[] {
    return [
      {
        name: 'analyze_task',
        description: 'Analyze a development task and provide a breakdown, risks, and next steps.',
        arguments: [
          {
            name: 'task_description',
            description: 'The task description text for analysis.',
            required: true,
          },
        ],
      },
      {
        name: 'generate_jira_git_workflow',
        description: 'Generate Jira workflow actions and Git commit message for a task.',
        arguments: [
          {
            name: 'task_description',
            description: 'The task description text for generating workflow steps.',
            required: true,
          },
          {
            name: 'issue_key',
            description: 'Jira issue key (for example dqw-3878) that will be used in transitions/comments and commit prefix.',
            required: true,
          },
          {
            name: 'branch_name',
            description: 'Git branch to use for local coding work. Must follow team format feature_<story-info>.',
            required: true,
          },
        ],
      }
    ];
  }

  async getPrompt(name: string, args: Record<string, string> | undefined): Promise<GetPromptResult | null> {
    if (name === 'analyze_task') {
      const taskDescription = args?.task_description ?? '';
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `You are a project analyst. Analyze the following task and return:
- goal summary
- assumptions and prerequisites
- risk points
- a step-by-step execution plan
- required outputs

Task Description:\n${taskDescription}`,
            },
          },
        ],
      };
    }

    if (name === 'generate_jira_git_workflow') {
      const taskDescription = args?.task_description ?? '';
      const issueKey = args?.issue_key ?? '';
      const branchName = args?.branch_name ?? '';
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `First read the resource conventions://engineering/git-jira-java and treat it as authoritative team policy.

Based on the task description below, produce:
1. A Jira operation sequence (add_jira_comment, transition_jira_issue, update_jira_issue_fields) with issue key ${issueKey}.
2. Recommended git flow (create/switch branch, git add, git commit, git push).
3. A standard commit message format (must start with issue key prefix, example: ${issueKey} feat: xxx).
4. A GitHub PR title and description template.
5. Validate output against the team conventions resource and explicitly list compliance checks.

Task: ${taskDescription}
Branch: ${branchName}`,
            },
          },
        ],
      };
    }

    return null;
  }
}
