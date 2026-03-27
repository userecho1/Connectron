export interface JavaAnalysisRequest {
  projectRoot: string;
  scanDepth?: number;
  includePackages?: string[];
  excludePackages?: string[];
}

export interface JavaApiEndpoint {
  controllerClass: string;
  httpMethod: string;
  path: string;
  methodName: string;
  inputType?: string;
  returnType?: string;
  serviceCalls: string[];
}

export interface JavaServiceMethod {
  serviceClass: string;
  methodName: string;
  parameters: string[];
  returnType?: string;
  repositoryCalls: string[];
}

export interface ProjectArchitectureReport {
  modules: string[];
  api_list: JavaApiEndpoint[];
  services: JavaServiceMethod[];
  entities: string[];
  database_tables: string[];
  dependencies: string[];
  bounded_context_hints: string[];
  scanned_files: number;
  warnings: string[];
}

export interface IJavaAnalysisProvider {
  analyzeProject(input: JavaAnalysisRequest): Promise<ProjectArchitectureReport>;
}
