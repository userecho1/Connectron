import { IGitProvider } from '../../../interfaces';

export interface GitAddInput {
  repoPath?: string;
  filePattern?: string;
}

export class GitAddUseCase {
  constructor(private readonly gitProvider: IGitProvider) {}

  async execute(input: GitAddInput): Promise<string> {
    return this.gitProvider.add(input);
  }
}

