import { CapabilityCandidate } from './ICapabilityExtractionProvider';

export interface GenerateMcpToolRequest {
  service_method: string;
  api_endpoint?: string;
  description: string;
  tool_name?: string;
  bounded_context?: string;
  input_schema?: CapabilityCandidate['input_schema'];
}

export interface GeneratedFilePlan {
  path: string;
  action: 'create' | 'update';
  content_preview: string;
}

export interface ToolGenerationPlan {
  dry_run: true;
  tool_name: string;
  summary: string;
  files: GeneratedFilePlan[];
  registration_patch: string;
  warnings: string[];
}

export interface IToolGenerationProvider {
  generateMcpToolPlan(input: GenerateMcpToolRequest): Promise<ToolGenerationPlan>;
}
