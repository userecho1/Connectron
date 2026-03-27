import { NexusFlowServer } from '../mcp/server';
import { registerToolModules } from '../mcp/tools/registerToolModules';
import { registerPromptModules } from '../mcp/prompts/registerPromptModules';
import { registerResourceModules } from '../mcp/resources/registerResourceModules';

export function createServer(): NexusFlowServer {
  const toolModules = registerToolModules();
  const promptModules = registerPromptModules();
  const resourceModules = registerResourceModules();
  return new NexusFlowServer(toolModules, promptModules, resourceModules);
}
