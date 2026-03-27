import { JavaAnalysisRequest, ProjectArchitectureReport, IJavaAnalysisProvider } from '../../../interfaces';

export class AnalyzeJavaProjectUseCase {
  constructor(private readonly javaAnalysisProvider: IJavaAnalysisProvider) {}

  async execute(input: JavaAnalysisRequest): Promise<ProjectArchitectureReport> {
    if (!input.projectRoot?.trim()) {
      throw new Error('projectRoot is required.');
    }

    if (input.scanDepth !== undefined && input.scanDepth < 1) {
      throw new Error('scanDepth must be greater than or equal to 1.');
    }

    return this.javaAnalysisProvider.analyzeProject({
      ...input,
      projectRoot: input.projectRoot.trim(),
      includePackages: input.includePackages?.map((value: string) => value.trim()).filter(Boolean),
      excludePackages: input.excludePackages?.map((value: string) => value.trim()).filter(Boolean),
    });
  }
}
