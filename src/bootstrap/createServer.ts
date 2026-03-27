import { NexusFlowServer } from '../mcp/server';
import { registerToolModules } from '../mcp/tools/registerToolModules';
import { registerPromptModules } from '../mcp/prompts/registerPromptModules';

export function createServer(): NexusFlowServer {
  const toolModules = registerToolModules();
  const promptModules = registerPromptModules();
  return new NexusFlowServer(toolModules, promptModules);
}
