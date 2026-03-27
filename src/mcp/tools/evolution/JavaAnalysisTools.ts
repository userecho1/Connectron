import { z } from 'zod';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { AnalyzeJavaProjectUseCase } from '../../../application/usecases/java-analysis/index.js';
import { ToolModule } from '../shared/ToolModule.js';

export const ANALYZE_JAVA_PROJECT_TOOL_NAME = 'analyze_java_project';

const analyzeJavaProjectInputSchema = z
  .object({
    projectRoot: z.string().min(1).describe('Absolute or relative root path of the Java project.'),
    scanDepth: z.number().int().min(1).max(20).optional().describe('Maximum directory depth to scan for Java files.'),
    includePackages: z.array(z.string().min(1)).optional().describe('Only include files within matching Java package prefixes.'),
    excludePackages: z.array(z.string().min(1)).optional().describe('Exclude files within matching Java package prefixes.'),
  })
  .strict();

export class JavaAnalysisTools implements ToolModule {
  constructor(private readonly analyzeJavaProjectUseCase: AnalyzeJavaProjectUseCase) {}

  listTools(): readonly Tool[] {
    return [
      {
        name: ANALYZE_JAVA_PROJECT_TOOL_NAME,
        description:
          'Analyze a Java project to detect controllers, services, entities, API endpoints, and bounded context hints.',
        inputSchema: {
          type: 'object',
          properties: {
            projectRoot: {
              type: 'string',
              description: 'Absolute or relative root path of the Java project.',
            },
            scanDepth: {
              type: 'number',
              description: 'Maximum directory depth to scan for Java files.',
              minimum: 1,
              maximum: 20,
            },
            includePackages: {
              type: 'array',
              items: { type: 'string' },
              description: 'Only include files within matching Java package prefixes.',
            },
            excludePackages: {
              type: 'array',
              items: { type: 'string' },
              description: 'Exclude files within matching Java package prefixes.',
            },
          },
          required: ['projectRoot'],
          additionalProperties: false,
        },
      },
    ];
  }

  async callTool(name: string, rawArgs: unknown): Promise<unknown | null> {
    if (name !== ANALYZE_JAVA_PROJECT_TOOL_NAME) {
      return null;
    }

    try {
      const args = analyzeJavaProjectInputSchema.parse(rawArgs ?? {});
      const report = await this.analyzeJavaProjectUseCase.execute(args);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(report, null, 2),
          },
        ],
        structuredContent: {
          analysis: 'Java project structure analyzed and normalized into architecture report.',
          plan: [
            'Review modules and bounded_context_hints',
            'Run extract_capabilities in next phase',
            'Review tool generation dry-run output before applying code changes',
          ],
          generated_code: [],
          generated_tools: [ANALYZE_JAVA_PROJECT_TOOL_NAME],
          next_step: 'Use extract_capabilities after validating this report with domain owners.',
          report,
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
