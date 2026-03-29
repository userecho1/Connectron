import { NexusFlowServer } from '../mcp/server';
import { registerToolModules } from '../mcp/tools/shared';
import { registerPromptModules } from '../mcp/prompts/registerPromptModules';
import { registerResourceModules } from '../mcp/resources/registerResourceModules';

export function createServer(): NexusFlowServer {
  return new NexusFlowServer(
    registerToolModules,
    registerPromptModules,
    registerResourceModules
  );
}