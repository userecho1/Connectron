import { IGitProvider, GitStatusResult, GitStatusInput, GitLogInput } from '../interfaces/IGitProvider.js';

export class GetGitInfoUseCase {
  constructor(private readonly gitRepo: IGitProvider) {}

  async getStatus(input: GitStatusInput = {}): Promise<GitStatusResult> {
    return this.gitRepo.getStatus(input);
  }

  async getLog(input: GitLogInput = {}): Promise<string> {
    const maxCount = input.maxCount && input.maxCount > 0 ? input.maxCount : 10;
    return this.gitRepo.getLog({ ...input, maxCount });
  }

  async add(input: { repoPath?: string; filePattern?: string }): Promise<string> {
    return this.gitRepo.add(input);
  }

  async commit(input: { repoPath?: string; message: string }): Promise<string> {
    return this.gitRepo.commit(input);
  }

  async push(input: { repoPath?: string; remote?: string; branch?: string }): Promise<string> {
    return this.gitRepo.push(input);
  }

  async pull(input: { repoPath?: string; remote?: string; branch?: string }): Promise<string> {
    return this.gitRepo.pull(input);
  }

  async checkout(input: { repoPath?: string; branch: string }): Promise<string> {
    return this.gitRepo.checkout(input);
  }
}
