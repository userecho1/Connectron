import {
  CreateOrUpdateFileInput,
  CreateOrUpdateFileResult,
  GithubPullRequestReader,
} from '../interfaces/IGithubProvider.js';

export class CreateOrUpdateFileUseCase {
  constructor(private readonly githubRepository: GithubPullRequestReader) {}

  async execute(input: CreateOrUpdateFileInput): Promise<CreateOrUpdateFileResult> {
    if (!input.owner?.trim() || !input.repo?.trim() || !input.path?.trim() || !input.message?.trim() || !input.content?.trim()) {
      throw new Error('owner/repo/path/message/content are required for createOrUpdateFile.');
    }

    return this.githubRepository.createOrUpdateFile({
      owner: input.owner.trim(),
      repo: input.repo.trim(),
      path: input.path.trim(),
      message: input.message.trim(),
      content: input.content,
      sha: input.sha,
      branch: input.branch,
    });
  }
}
