import { z } from 'zod';
import { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';
import { QueryDatabaseUseCase } from '../../../application/usecases/database';
import { DatabaseQueryParameters } from '../../../application/interfaces';
import { ToolModule } from '../shared/ToolModule';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';

const queryDatabaseInputSchema = z
  .object({
    sql: z.string().min(1).describe('SQL query text to execute against SQL Server.'),
    parameters: z
      .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
      .optional()
      .describe('Named query parameters. Example: { "userId": 1001 }'),
  })
  .strict();

const formatSqlServerInputSchema = z
  .object({
    sql: z.string().min(1).describe('Raw SQL text to format. Only whitespace, indentation and line breaks are changed.'),
    indentSize: z.number().int().min(1).max(8).default(2).describe('Indent spaces per nested block. Default: 2.'),
    uppercaseKeywords: z.boolean().default(true).describe('Whether SQL keywords should be uppercased. Default: true.'),
    outputPath: z.string().min(1).optional().describe('Optional output file path for saving formatted SQL.'),
  })
  .strict();

export const QUERY_DATABASE_TOOL_NAME = 'query_database' as const;
export const FORMAT_SQLSERVER_SQL_TOOL_NAME = 'format_sqlserver_sql' as const;

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

export const formatSqlServerToolDefinition: Tool = {
  name: FORMAT_SQLSERVER_SQL_TOOL_NAME,
  description: 'Format SQL Server SQL text (whitespace/indent/newline only), and optionally save it to a file.',
  inputSchema: {
    type: 'object',
    properties: {
      sql: {
        type: 'string',
        description: 'Raw SQL text to format. Only whitespace, indentation and line breaks are changed.',
      },
      indentSize: {
        type: 'number',
        minimum: 1,
        maximum: 8,
        description: 'Indent spaces per nested block. Default: 2.',
      },
      uppercaseKeywords: {
        type: 'boolean',
        description: 'Whether SQL keywords should be uppercased. Default: true.',
      },
      outputPath: {
        type: 'string',
        description: 'Optional output file path for saving formatted SQL.',
      },
    },
    required: ['sql'],
    additionalProperties: false,
  },
};

type SqlTokenType = 'word' | 'number' | 'string' | 'bracket' | 'lineComment' | 'blockComment' | 'symbol';

interface SqlToken {
  type: SqlTokenType;
  value: string;
}

const NEWLINE_BEFORE_KEYWORDS = new Set([
  'BEGIN',
  'END',
  'DECLARE',
  'SET',
  'SELECT',
  'FROM',
  'WHERE',
  'GROUP',
  'ORDER',
  'HAVING',
  'JOIN',
  'INNER',
  'LEFT',
  'RIGHT',
  'FULL',
  'CROSS',
  'UNION',
  'EXCEPT',
  'INTERSECT',
  'VALUES',
  'WHEN',
  'ELSE',
]);

const INDENT_AFTER_KEYWORDS = new Set(['BEGIN', 'CASE']);
const DEDENT_BEFORE_KEYWORDS = new Set(['END']);
const BREAK_WORDS = new Set(['AND', 'OR']);
const CLAUSE_KEYWORDS = new Set(['SELECT', 'DECLARE']);

const KEYWORDS = new Set([
  'ADD', 'ALL', 'ALTER', 'AND', 'ANY', 'AS', 'ASC', 'BACKUP', 'BEGIN', 'BETWEEN', 'BY', 'CASE', 'CHECK', 'COLUMN',
  'CONSTRAINT', 'CREATE', 'DATABASE', 'DEFAULT', 'DELETE', 'DESC', 'DECLARE', 'DISTINCT', 'DROP', 'ELSE', 'END', 'EXEC',
  'EXISTS', 'FROM', 'FULL', 'FUNCTION', 'GROUP', 'HAVING', 'IF', 'IN', 'INDEX', 'INNER', 'INSERT', 'INTO', 'IS', 'JOIN',
  'LEFT', 'LIKE', 'LIMIT', 'MERGE', 'NOT', 'NULL', 'ON', 'OR', 'ORDER', 'OUTER', 'PRIMARY', 'PROCEDURE', 'RETURN',
  'RIGHT', 'SELECT', 'SET', 'TABLE', 'THEN', 'TOP', 'TRUNCATE', 'UNION', 'UNIQUE', 'UPDATE', 'VALUES', 'VIEW', 'WHEN',
  'WHERE', 'WHILE', 'WITH',
]);

function isWordStart(char: string): boolean {
  return /[A-Za-z_@#]/.test(char);
}

function isWordPart(char: string): boolean {
  return /[A-Za-z0-9_@#$]/.test(char);
}

function tokenizeSql(sql: string): SqlToken[] {
  const tokens: SqlToken[] = [];
  let index = 0;

  while (index < sql.length) {
    const ch = sql[index];

    if (/\s/.test(ch)) {
      index += 1;
      continue;
    }

    if (ch === '-' && sql[index + 1] === '-') {
      let end = index + 2;
      while (end < sql.length && sql[end] !== '\n') {
        end += 1;
      }
      tokens.push({ type: 'lineComment', value: sql.slice(index, end) });
      index = end;
      continue;
    }

    if (ch === '/' && sql[index + 1] === '*') {
      let end = index + 2;
      while (end < sql.length - 1 && !(sql[end] === '*' && sql[end + 1] === '/')) {
        end += 1;
      }
      end = Math.min(end + 2, sql.length);
      tokens.push({ type: 'blockComment', value: sql.slice(index, end) });
      index = end;
      continue;
    }

    if (ch === "'") {
      let end = index + 1;
      while (end < sql.length) {
        if (sql[end] === "'" && sql[end + 1] === "'") {
          end += 2;
          continue;
        }
        if (sql[end] === "'") {
          end += 1;
          break;
        }
        end += 1;
      }
      tokens.push({ type: 'string', value: sql.slice(index, end) });
      index = end;
      continue;
    }

    if (ch === '[') {
      let end = index + 1;
      while (end < sql.length) {
        if (sql[end] === ']' && sql[end + 1] === ']') {
          end += 2;
          continue;
        }
        if (sql[end] === ']') {
          end += 1;
          break;
        }
        end += 1;
      }
      tokens.push({ type: 'bracket', value: sql.slice(index, end) });
      index = end;
      continue;
    }

    if (isWordStart(ch)) {
      let end = index + 1;
      while (end < sql.length && isWordPart(sql[end])) {
        end += 1;
      }
      tokens.push({ type: 'word', value: sql.slice(index, end) });
      index = end;
      continue;
    }

    if (/[0-9]/.test(ch)) {
      let end = index + 1;
      while (end < sql.length && /[0-9.]/.test(sql[end])) {
        end += 1;
      }
      tokens.push({ type: 'number', value: sql.slice(index, end) });
      index = end;
      continue;
    }

    const pair = sql.slice(index, index + 2);
    if (['<=', '>=', '<>', '!='].includes(pair)) {
      tokens.push({ type: 'symbol', value: pair });
      index += 2;
      continue;
    }

    tokens.push({ type: 'symbol', value: ch });
    index += 1;
  }

  return tokens;
}

function formatSqlServer(sql: string, indentSize: number, uppercaseKeywords: boolean): string {
  const tokens = tokenizeSql(sql);
  const lines: string[] = [];
  let currentLine = '';
  let indentLevel = 0;
  let activeClause: string | null = null;
  let parenthesisDepth = 0;

  const pad = () => ' '.repeat(Math.max(0, indentLevel) * indentSize);
  const lastChar = () => (currentLine.length === 0 ? '' : currentLine[currentLine.length - 1]);

  const pushLine = () => {
    if (currentLine.trim().length > 0) {
      lines.push(currentLine.trimEnd());
      currentLine = '';
    }
  };

  const ensureLineStart = () => {
    if (currentLine.length === 0) {
      currentLine = pad();
    }
  };

  const addToken = (value: string, needsSpaceBefore = true) => {
    ensureLineStart();
    if (needsSpaceBefore && !['', ' ', '\n', '(', '.'].includes(lastChar())) {
      currentLine += ' ';
    }
    currentLine += value;
  };

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const prev = index > 0 ? tokens[index - 1] : undefined;
    if (token.type === 'lineComment' || token.type === 'blockComment') {
      pushLine();
      currentLine = `${pad()}${token.value}`;
      pushLine();
      continue;
    }

    if (token.type === 'word') {
      const upper = token.value.toUpperCase();
      const rendered = uppercaseKeywords && KEYWORDS.has(upper) ? upper : token.value;

      if (DEDENT_BEFORE_KEYWORDS.has(upper)) {
        pushLine();
        indentLevel = Math.max(0, indentLevel - 1);
      }

      if ((NEWLINE_BEFORE_KEYWORDS.has(upper) || BREAK_WORDS.has(upper)) && currentLine.trim().length > 0) {
        pushLine();
      }

      addToken(rendered);

      if (CLAUSE_KEYWORDS.has(upper)) {
        activeClause = upper;
      }

      if (INDENT_AFTER_KEYWORDS.has(upper)) {
        pushLine();
        indentLevel += 1;
      }

      if (upper === 'ELSE' || upper === 'THEN') {
        pushLine();
      }

      continue;
    }

    if (token.type === 'number' || token.type === 'string' || token.type === 'bracket') {
      addToken(token.value);
      continue;
    }

    if (token.value === ';') {
      addToken(';', false);
      pushLine();
      activeClause = null;
      continue;
    }

    if (token.value === ',') {
      addToken(',', false);
      if ((activeClause === 'SELECT' || activeClause === 'DECLARE') && parenthesisDepth === 0) {
        pushLine();
      }
      continue;
    }

    if (token.value === '(') {
      const noSpaceBefore = prev?.type === 'word' || prev?.type === 'bracket';
      addToken('(', !noSpaceBefore);
      parenthesisDepth += 1;
      continue;
    }

    if (token.value === ')') {
      addToken(')', false);
      parenthesisDepth = Math.max(0, parenthesisDepth - 1);
      continue;
    }

    if (token.value === '.') {
      addToken('.', false);
      continue;
    }

    if (['=', '>', '<', '>=', '<=', '<>', '!=', '+', '-', '*', '/', '%'].includes(token.value)) {
      addToken(token.value);
      continue;
    }

    addToken(token.value, false);
  }

  pushLine();
  return lines.join('\n').trim();
}

function resolveOutputPath(outputPath: string): string {
  const resolvedCwd = resolve(process.cwd()).toLowerCase();
  const resolvedOutput = resolve(outputPath);
  const normalizedOutput = resolvedOutput.toLowerCase();
  const workspacePrefix = `${resolvedCwd}${sep}`;
  if (normalizedOutput !== resolvedCwd && !normalizedOutput.startsWith(workspacePrefix)) {
    throw new Error('outputPath must be inside current workspace.');
  }
  return resolvedOutput;
}

export class DatabaseTools implements ToolModule {
  constructor(private readonly queryDatabaseUseCase: QueryDatabaseUseCase) {}

  public listTools(): readonly Tool[] {
    return [queryDatabaseToolDefinition, formatSqlServerToolDefinition];
  }

  public async callTool(name: string, rawArgs: unknown): Promise<CallToolResult | null> {
    try {
      if (name === QUERY_DATABASE_TOOL_NAME) {
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
                2,
              ),
            },
          ],
          structuredContent: {
            rowCount: result.rowCount,
            rows: result.rows,
          },
        };
      }

      if (name === FORMAT_SQLSERVER_SQL_TOOL_NAME) {
        const input = formatSqlServerInputSchema.parse(rawArgs ?? {});
        const formattedSql = formatSqlServer(input.sql, input.indentSize, input.uppercaseKeywords);

        let savedTo: string | undefined;
        if (input.outputPath) {
          const targetPath = resolveOutputPath(input.outputPath);
          await mkdir(dirname(targetPath), { recursive: true });
          await writeFile(targetPath, formattedSql, 'utf8');
          savedTo = targetPath;
        }

        return {
          content: [
            {
              type: 'text',
              text: savedTo ? `Saved formatted SQL to: ${savedTo}\n\n${formattedSql}` : formattedSql,
            },
          ],
          structuredContent: {
            formattedSql,
            savedTo,
          },
        };
      }

      return null;
    } catch (error: any) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Error executing ${name}: ${error?.message || String(error)}` }],
      };
    }
  }
}

