import { GitOperationRepository, GitStatusResult, GitStatusInput, GitLogInput } from '../interfaces/GitRepository.js';

export class GetGitInfoUseCase {
  constructor(private readonly gitRepo: GitOperationRepository) {}

  async getStatus(input: GitStatusInput = {}): Promise<GitStatusResult> {
    return this.gitRepo.getStatus(input);
  }

  async getLog(input: GitLogInput = {}): Promise<string> {
    const maxCount = input.maxCount && input.maxCount > 0 ? input.maxCount : 10;
    return this.gitRepo.getLog({ ...input, maxCount });
  }
}
