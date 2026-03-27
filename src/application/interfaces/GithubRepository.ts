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

export interface GetFileContentInput {
  owner: string;
  repo: string;
  path: string;
  ref?: string;
}

export interface GetFileContentResult {
  path: string;
  sha: string;
  url: string;
  encoding: string;
  content: string;
}

export interface GithubPullRequestReader {
  listPullRequests(input: ListPullRequestsInput): Promise<ListPullRequestsResult>;
  getFileContent(input: GetFileContentInput): Promise<GetFileContentResult>;
}
