import { IGitProvider, GitLogInput } from '../../../interfaces';

export class GetGitLogUseCase {
  constructor(private readonly gitProvider: IGitProvider) {}

  async execute(input: GitLogInput = {}): Promise<string> {
    const maxCount = input.maxCount && input.maxCount > 0 ? input.maxCount : 10;
    return this.gitProvider.getLog({ ...input, maxCount });
  }
}

