import { Resource, TextResourceContents } from '@modelcontextprotocol/sdk/types.js';

export interface ResourceModule {
  listResources(): ReadonlyArray<Resource>;
  readResource(uri: string): Promise<ReadonlyArray<TextResourceContents> | null>;
}
