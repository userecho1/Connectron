import { IGitProvider } from '../../../interfaces/IGitProvider.js';

export interface GitCommitInput {
  repoPath?: string;
  message: string;
}

export class GitCommitUseCase {
  constructor(private readonly gitProvider: IGitProvider) {}

  async execute(input: GitCommitInput): Promise<string> {
    return this.gitProvider.commit(input);
  }
}
