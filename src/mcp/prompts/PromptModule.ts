import { GetPromptResult, Prompt } from '@modelcontextprotocol/sdk/types.js';

export interface PromptModule {
  listPrompts(): ReadonlyArray<Prompt>;
  getPrompt(name: string, args?: Record<string, string>): Promise<GetPromptResult | null>;
}
