import {
  GenerateMcpToolRequest,
  IToolGenerationProvider,
  ToolGenerationPlan,
} from '../../../interfaces/IToolGenerationProvider.js';

export class GenerateMcpToolUseCase {
  constructor(private readonly toolGenerationProvider: IToolGenerationProvider) {}

  async execute(input: GenerateMcpToolRequest): Promise<ToolGenerationPlan> {
    if (!input.service_method?.trim()) {
      throw new Error('service_method is required.');
    }

    if (!input.description?.trim()) {
      throw new Error('description is required.');
    }

    return this.toolGenerationProvider.generateMcpToolPlan({
      ...input,
      service_method: input.service_method.trim(),
      description: input.description.trim(),
      api_endpoint: input.api_endpoint?.trim(),
      tool_name: input.tool_name?.trim(),
      bounded_context: input.bounded_context?.trim(),
    });
  }
}
