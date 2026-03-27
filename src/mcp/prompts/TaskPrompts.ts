import { Prompt } from '@modelcontextprotocol/sdk/types.js';
import { PromptModule } from './PromptModule.js';

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
    ];
  }

  async getPrompt(name: string, args: Record<string, string> | undefined): Promise<unknown | null> {
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
    return null;
  }
}
