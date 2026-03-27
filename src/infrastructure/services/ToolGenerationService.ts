import {
  GenerateMcpToolRequest,
  GeneratedFilePlan,
  IToolGenerationProvider,
  ToolGenerationPlan,
} from '../../application/interfaces/IToolGenerationProvider.js';

export class ToolGenerationService implements IToolGenerationProvider {
  async generateMcpToolPlan(input: GenerateMcpToolRequest): Promise<ToolGenerationPlan> {
    const normalizedToolName = this.normalizeToolName(input.tool_name || this.deriveToolName(input.service_method, input.api_endpoint));
    const classBaseName = this.toPascalCase(normalizedToolName);
    const useCaseName = `${classBaseName}UseCase`;
    const providerName = `I${classBaseName}Provider`;
    const adapterName = `${classBaseName}ServiceAdapter`;
    const toolClassName = `${classBaseName}ToolModule`;

    const files: GeneratedFilePlan[] = [
      {
        path: `src/application/interfaces/${providerName}.ts`,
        action: 'create',
        content_preview: this.previewInterface(providerName, normalizedToolName),
      },
      {
        path: `src/application/usecases/generated/command/${useCaseName}.ts`,
        action: 'create',
        content_preview: this.previewUseCase(useCaseName, providerName, normalizedToolName),
      },
      {
        path: `src/infrastructure/services/${adapterName}.ts`,
        action: 'create',
        content_preview: this.previewAdapter(adapterName, providerName, normalizedToolName),
      },
      {
        path: `src/mcp/tools/generated/${toolClassName}.ts`,
        action: 'create',
        content_preview: this.previewToolModule(toolClassName, useCaseName, normalizedToolName),
      },
    ];

    const registrationPatch = [
      "import { " + useCaseName + " } from '../../application/usecases/generated';",
      "import { " + adapterName + " } from '../../infrastructure/services/" + adapterName + "';",
      "import { " + toolClassName + " } from './generated/" + toolClassName + "';",
      '...',
      'const adapter = new ' + adapterName + '();',
      'const useCase = new ' + useCaseName + '(adapter);',
      'modules.push(new ' + toolClassName + '(useCase));',
    ].join('\n');

    const warnings: string[] = [];
    if (!input.api_endpoint) {
      warnings.push('api_endpoint was not provided; HTTP method inference was skipped.');
    }
    if (!input.input_schema) {
      warnings.push('input_schema was not provided; generated tool preview uses a generic payload object.');
    }

    return {
      dry_run: true,
      tool_name: normalizedToolName,
      summary: `Dry-run plan generated for ${normalizedToolName} from ${input.service_method}.`,
      files,
      registration_patch: registrationPatch,
      warnings,
    };
  }

  private deriveToolName(serviceMethod: string, apiEndpoint?: string): string {
    const [, rawMethod = serviceMethod] = serviceMethod.split('.');
    const methodName = rawMethod || serviceMethod;
    const lowerMethod = methodName.toLowerCase();

    let verb = 'get';
    if (lowerMethod.startsWith('create') || lowerMethod.startsWith('add')) verb = 'create';
    else if (lowerMethod.startsWith('update') || lowerMethod.startsWith('edit')) verb = 'update';
    else if (lowerMethod.startsWith('delete') || lowerMethod.startsWith('remove')) verb = 'delete';
    else if (lowerMethod.startsWith('list') || lowerMethod.startsWith('search')) verb = 'list';
    else if (lowerMethod.startsWith('cancel')) verb = 'cancel';

    let resource = methodName.replace(/^(create|get|list|update|delete|remove|cancel|add|search|find|fetch)/i, '');
    if (!resource && apiEndpoint) {
      const segment = apiEndpoint
        .split('/')
        .map((part) => part.trim())
        .filter(Boolean)
        .find((part) => !part.startsWith('{'));
      resource = segment || 'resource';
    }

    return `${verb}_${this.toSnakeCase(resource || 'resource')}`;
  }

  private normalizeToolName(value: string): string {
    const normalized = this.toSnakeCase(value);
    return normalized || 'get_resource';
  }

  private toSnakeCase(value: string): string {
    return value
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase();
  }

  private toPascalCase(value: string): string {
    return value
      .split('_')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
  }

  private previewInterface(providerName: string, toolName: string): string {
    return [
      `export interface ${providerName} {`,
      `  execute${this.toPascalCase(toolName)}(input: Record<string, unknown>): Promise<unknown>;`,
      '}',
    ].join('\n');
  }

  private previewUseCase(useCaseName: string, providerName: string, toolName: string): string {
    return [
      `export class ${useCaseName} {`,
      `  constructor(private readonly provider: ${providerName}) {}`,
      '  async execute(input: Record<string, unknown>) {',
      `    return this.provider.execute${this.toPascalCase(toolName)}(input);`,
      '  }',
      '}',
    ].join('\n');
  }

  private previewAdapter(adapterName: string, providerName: string, toolName: string): string {
    return [
      `export class ${adapterName} implements ${providerName} {`,
      `  async execute${this.toPascalCase(toolName)}(input: Record<string, unknown>): Promise<unknown> {`,
      '    // TODO: map to domain service call',
      '    return input;',
      '  }',
      '}',
    ].join('\n');
  }

  private previewToolModule(toolClassName: string, useCaseName: string, toolName: string): string {
    return [
      `export class ${toolClassName} {`,
      `  constructor(private readonly useCase: ${useCaseName}) {}`,
      "  listTools() { return [{ name: '" + toolName + "', inputSchema: { type: 'object', properties: {}, additionalProperties: false } }]; }",
      "  async callTool(name: string, rawArgs: unknown) { if (name !== '" + toolName + "') return null; return this.useCase.execute((rawArgs ?? {}) as Record<string, unknown>); }",
      '}',
    ].join('\n');
  }
}
