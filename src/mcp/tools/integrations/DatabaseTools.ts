import { z } from 'zod';
import { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';
import { QueryDatabaseUseCase } from '../../../application/usecases/database';
import { DatabaseQueryParameters } from '../../../application/interfaces';
import { ToolModule } from '../shared/ToolModule';

const queryDatabaseInputSchema = z
  .object({
    sql: z.string().min(1).describe('SQL query text to execute against SQL Server.'),
    parameters: z
      .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
      .optional()
      .describe('Named query parameters. Example: { "userId": 1001 }'),
  })
  .strict();

export const QUERY_DATABASE_TOOL_NAME = 'query_database' as const;

export const queryDatabaseToolDefinition: Tool = {
  name: QUERY_DATABASE_TOOL_NAME,
  description: 'Execute a SQL Server query and return structured JSON rows.',
  inputSchema: {
    type: 'object',
    properties: {
      sql: {
        type: 'string',
        description: 'SQL query text to execute against SQL Server.',
      },
      parameters: {
        type: 'object',
        description: 'Named query parameters for prepared statements.',
        additionalProperties: {
          anyOf: [
            { type: 'string' },
            { type: 'number' },
            { type: 'boolean' },
            { type: 'null' },
          ],
        },
      },
    },
    required: ['sql'],
    additionalProperties: false,
  },
};

export class DatabaseTools implements ToolModule {
  constructor(private readonly queryDatabaseUseCase: QueryDatabaseUseCase) {}

  public listTools(): readonly Tool[] {
    return [queryDatabaseToolDefinition];
  }

  public async callTool(name: string, rawArgs: unknown): Promise<CallToolResult | null> {
    if (name !== QUERY_DATABASE_TOOL_NAME) {
      return null;
    }

    try {
      const input = queryDatabaseInputSchema.parse(rawArgs ?? {});

      const result = await this.queryDatabaseUseCase.execute({
      sql: input.sql,
      parameters: input.parameters as DatabaseQueryParameters | undefined,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              rowCount: result.rowCount,
              rows: result.rows,
            },
            null,
            2
          ),
        },
      ],
      structuredContent: {
        rowCount: result.rowCount,
        rows: result.rows,
      },
    };
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Error executing ${name}: ${error?.message || String(error)}` }],
      };
    }
  }
}

