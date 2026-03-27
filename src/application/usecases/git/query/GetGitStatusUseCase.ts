import { IGitProvider, GitStatusInput, GitStatusResult } from '../../../interfaces';

export class GetGitStatusUseCase {
  constructor(private readonly gitProvider: IGitProvider) {}

  async execute(input: GitStatusInput = {}): Promise<GitStatusResult> {
    return this.gitProvider.getStatus(input);
  }
}

