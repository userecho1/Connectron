import {
  GithubPullRequestReader,
  GetFileContentInput,
  GetFileContentResult,
} from '../interfaces/GithubRepository.js';

export class GetFileContentUseCase {
  constructor(private readonly githubRepository: GithubPullRequestReader) {}

  async execute(input: GetFileContentInput): Promise<GetFileContentResult> {
    if (!input.owner || !input.owner.trim()) {
      throw new Error('owner is required');
    }

    if (!input.repo || !input.repo.trim()) {
      throw new Error('repo is required');
    }

    if (!input.path || !input.path.trim()) {
      throw new Error('path is required');
    }

    return this.githubRepository.getFileContent({
      owner: input.owner.trim(),
      repo: input.repo.trim(),
      path: input.path.trim(),
      ref: input.ref?.trim(),
    });
  }
}
