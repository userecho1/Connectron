import { NexusFlowServer } from '../mcp/server';
import { registerToolModules } from '../mcp/tools/registerToolModules';

export function createServer(): NexusFlowServer {
  const toolModules = registerToolModules();
  return new NexusFlowServer(toolModules);
}
