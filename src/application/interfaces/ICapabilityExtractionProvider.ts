import { ProjectArchitectureReport } from './IJavaAnalysisProvider.js';

export interface CapabilityCandidate {
  name: string;
  description: string;
  source: {
    controllerClass?: string;
    serviceMethod?: string;
    httpMethod?: string;
    path?: string;
  };
  input_schema: {
    type: 'object';
    properties: Record<string, { type: string; description?: string }>;
    required?: string[];
    additionalProperties: boolean;
  };
  bounded_context: string;
}

export interface ExtractCapabilitiesRequest {
  report: ProjectArchitectureReport;
}

export interface ExtractCapabilitiesResult {
  capabilities: CapabilityCandidate[];
  conflicts: string[];
  bounded_contexts: string[];
}

export interface ICapabilityExtractionProvider {
  extractCapabilities(input: ExtractCapabilitiesRequest): Promise<ExtractCapabilitiesResult>;
}
