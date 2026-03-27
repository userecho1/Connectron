import {
  GenerateDomainMcpServersRequest,
  GenerateDomainMcpServersResult,
  IDomainMcpGenerationProvider,
} from '../../../interfaces/IDomainMcpGenerationProvider.js';

export class GenerateDomainMcpServersUseCase {
  constructor(private readonly domainMcpGenerationProvider: IDomainMcpGenerationProvider) {}

  async execute(input: GenerateDomainMcpServersRequest): Promise<GenerateDomainMcpServersResult> {
    if (!input.confirm) {
      throw new Error('confirm must be true to run domain_mcp_generator.');
    }

    if (!input.report) {
      throw new Error('report is required.');
    }

    if (!Array.isArray(input.capabilities)) {
      throw new Error('capabilities must be an array.');
    }

    return this.domainMcpGenerationProvider.generateDomainServerPlans(input);
  }
}
