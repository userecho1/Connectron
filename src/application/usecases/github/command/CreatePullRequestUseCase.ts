import {
  CreatePullRequestInput,
  CreatePullRequestResult,
  GithubPullRequestReader,
} from '../../../interfaces';

export class CreatePullRequestUseCase {
  constructor(private readonly githubRepository: GithubPullRequestReader) {}

  async execute(input: CreatePullRequestInput): Promise<CreatePullRequestResult> {
    if (!input.owner?.trim() || !input.repo?.trim() || !input.title?.trim() || !input.head?.trim() || !input.base?.trim()) {
      throw new Error('owner/repo/title/head/base are required for createPullRequest.');
    }

    return this.githubRepository.createPullRequest({
      owner: input.owner.trim(),
      repo: input.repo.trim(),
      title: input.title.trim(),
      head: input.head.trim(),
      base: input.base.trim(),
      body: input.body,
    });
  }
}


