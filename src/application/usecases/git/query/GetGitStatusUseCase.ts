import { IGitProvider, GitStatusInput, GitStatusResult } from '../../../interfaces/IGitProvider.js';

export class GetGitStatusUseCase {
  constructor(private readonly gitProvider: IGitProvider) {}

  async execute(input: GitStatusInput = {}): Promise<GitStatusResult> {
    return this.gitProvider.getStatus(input);
  }
}
