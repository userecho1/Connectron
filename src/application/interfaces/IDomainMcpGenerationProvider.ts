import { CapabilityCandidate } from './ICapabilityExtractionProvider.js';
import { ProjectArchitectureReport } from './IJavaAnalysisProvider.js';

export interface DomainServerPlan {
  domain: string;
  server_name: string;
  capabilities: string[];
  files: Array<{
    path: string;
    action: 'create';
    content_preview: string;
  }>;
}

export interface GenerateDomainMcpServersRequest {
  report: ProjectArchitectureReport;
  capabilities: CapabilityCandidate[];
  domains?: string[];
  confirm: boolean;
}

export interface GenerateDomainMcpServersResult {
  dry_run: true;
  generated_servers: DomainServerPlan[];
  skipped_capabilities: string[];
  warnings: string[];
}

export interface IDomainMcpGenerationProvider {
  generateDomainServerPlans(input: GenerateDomainMcpServersRequest): Promise<GenerateDomainMcpServersResult>;
}
