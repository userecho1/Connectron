export interface ToolModule {
  listTools(): readonly unknown[];
  callTool(name: string, rawArgs: unknown): Promise<unknown | null>;
}
