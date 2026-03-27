import { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';

export interface ToolModule {
  listTools(): ReadonlyArray<Tool>;
  callTool(name: string, rawArgs: unknown): Promise<CallToolResult | null>;
}
