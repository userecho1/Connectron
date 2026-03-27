import { Prompt } from '@modelcontextprotocol/sdk/types.js';

export interface PromptModule {
  listPrompts(): readonly Prompt[];
  getPrompt(name: string, args: Record<string, string> | undefined): Promise<unknown | null>;
}
