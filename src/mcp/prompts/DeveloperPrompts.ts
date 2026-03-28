import { GetPromptResult, Prompt } from '@modelcontextprotocol/sdk/types.js';
import { PromptModule } from './PromptModule';

export class DeveloperPrompts implements PromptModule {
  listPrompts(): Prompt[] {
    return [
      {
        name: 'code_review',
        description: 'A prompt to guide an LLM to review code changes or PRs.',
        arguments: [
          {
            name: 'code_context',
            description: 'The code snippet or pull request diff to review.',
            required: true,
          }
        ]
      },
      {
        name: 'generate_unit_tests',
        description: 'A prompt to generate unit tests for a specific function or module.',
        arguments: [
          {
            name: 'target_code',
            description: 'The target source code needing tests.',
            required: true,
          },
          {
            name: 'test_framework',
            description: 'The testing framework to use (e.g., Jest, Mocha, JUnit)',
            required: false,
          }
        ]
      }
    ];
  }

  async getPrompt(name: string, args: Record<string, string> | undefined): Promise<GetPromptResult | null> {
    switch (name) {
      case 'code_review': {
        const context = args?.code_context || '';
        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `You are a senior software engineer. Please review the following code changes. 
Look for:
- Potential bugs and edge cases
- Performance issues
- Security vulnerabilities

Code Context:
${context}

Please provide your feedback separated by severity (Critical, Warning, Suggestion).`,
              },
            },
          ],
        };
      }
      case 'generate_unit_tests': {
        const code = args?.target_code || '';
        const framework = args?.test_framework || 'Jest';
        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `Write comprehensive unit tests for the following code using ${framework}.
Ensure you cover positive paths, edge cases, and expected exceptions.

Code Context:
${code}`,
              },
            },
          ],
        };
      }
      default:
        return null;
    }
  }
}
