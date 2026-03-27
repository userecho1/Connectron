import { Resource, TextResourceContents } from '@modelcontextprotocol/sdk/types.js';

export interface ResourceModule {
  listResources(): readonly Resource[];
  readResource(uri: string): Promise<readonly TextResourceContents[] | null>;
}
