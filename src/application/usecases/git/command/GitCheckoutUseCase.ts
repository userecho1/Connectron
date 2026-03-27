import { IGitProvider } from '../../../interfaces';

export interface GitCheckoutInput {
  repoPath?: string;
  branch: string;
}

export class GitCheckoutUseCase {
  constructor(private readonly gitProvider: IGitProvider) {}

  async execute(input: GitCheckoutInput): Promise<string> {
    return this.gitProvider.checkout(input);
  }
}

