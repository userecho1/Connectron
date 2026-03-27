import { IGitProvider } from '../../../interfaces/IGitProvider.js';

export interface GitPullInput {
  repoPath?: string;
  remote?: string;
  branch?: string;
}

export class GitPullUseCase {
  constructor(private readonly gitProvider: IGitProvider) {}

  async execute(input: GitPullInput): Promise<string> {
    return this.gitProvider.pull(input);
  }
}
