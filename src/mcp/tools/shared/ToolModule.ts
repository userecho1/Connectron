import { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

export interface ToolModule {
  listTools(): ReadonlyArray<Tool>;
  callTool(name: string, rawArgs: unknown): Promise<CallToolResult | null>;
  setServer?(server: Server): void;
}
