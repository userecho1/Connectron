import {
  MergePullRequestInput,
  MergePullRequestResult,
  GithubPullRequestReader,
} from '../interfaces/IGithubProvider.js';

export class MergePullRequestUseCase {
  constructor(private readonly githubRepository: GithubPullRequestReader) {}

  async execute(input: MergePullRequestInput): Promise<MergePullRequestResult> {
    if (!input.owner?.trim() || !input.repo?.trim() || !input.pull_number) {
      throw new Error('owner/repo/pull_number are required for mergePullRequest.');
    }

    return this.githubRepository.mergePullRequest({
      owner: input.owner.trim(),
      repo: input.repo.trim(),
      pull_number: input.pull_number,
      commit_title: input.commit_title,
      commit_message: input.commit_message,
      merge_method: input.merge_method,
    });
  }
}
