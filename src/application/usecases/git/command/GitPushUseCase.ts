import { IGitProvider } from '../../../interfaces';

export interface GitPushInput {
  repoPath?: string;
  remote?: string;
  branch?: string;
}

export class GitPushUseCase {
  constructor(private readonly gitProvider: IGitProvider) {}

  async execute(input: GitPushInput): Promise<string> {
    return this.gitProvider.push(input);
  }
}

