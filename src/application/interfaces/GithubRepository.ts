export type PullRequestState = 'open' | 'closed' | 'all';
export type PullRequestSort = 'created' | 'updated' | 'popularity' | 'long-running';
export type PullRequestDirection = 'asc' | 'desc';

export interface ListPullRequestsInput {
  owner: string;
  repo: string;
  state?: PullRequestState;
  sort?: PullRequestSort;
  direction?: PullRequestDirection;
  perPage?: number;
  page?: number;
}

export interface PullRequestSummary {
  number: number;
  title: string;
  state: string;
  author: string;
  url: string;
  createdAt: string;
  updatedAt: string;
  headRef: string;
  baseRef: string;
}

export interface ListPullRequestsResult {
  items: PullRequestSummary[];
  totalCount: number;
  page: number;
  perPage: number;
}

export interface GithubPullRequestReader {
  listPullRequests(input: ListPullRequestsInput): Promise<ListPullRequestsResult>;
}
