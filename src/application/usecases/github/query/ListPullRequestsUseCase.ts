import {
  GithubPullRequestReader,
  ListPullRequestsInput,
  ListPullRequestsResult,
} from '../../../interfaces/IGithubProvider';

export class ListPullRequestsUseCase {
  constructor(private readonly githubPullRequestReader: GithubPullRequestReader) {}

  public async execute(input: ListPullRequestsInput): Promise<ListPullRequestsResult> {
    const owner = input.owner.trim();
    const repo = input.repo.trim();

    if (!owner || !repo) {
      throw new Error('owner and repo are required.');
    }

    if (input.perPage !== undefined && (input.perPage < 1 || input.perPage > 100)) {
      throw new Error('perPage must be between 1 and 100.');
    }

    if (input.page !== undefined && input.page < 1) {
      throw new Error('page must be greater than or equal to 1.');
    }

    return this.githubPullRequestReader.listPullRequests({
      ...input,
      owner,
      repo,
    });
  }
}

