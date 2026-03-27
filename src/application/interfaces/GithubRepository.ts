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

export interface CreateOrUpdateFileInput {
  owner: string;
  repo: string;
  path: string;
  message: string;
  content: string;
  sha?: string;
  branch?: string;
}

export interface CreateOrUpdateFileResult {
  content: {
    path: string;
    sha: string;
    url: string;
  };
  commit: {
    sha: string;
    message: string;
  };
}

export interface CreatePullRequestInput {
  owner: string;
  repo: string;
  title: string;
  head: string;
  base: string;
  body?: string;
}

export interface CreatePullRequestResult {
  id: number;
  number: number;
  url: string;
  title: string;
  base: string;
  head: string;
}

export interface MergePullRequestInput {
  owner: string;
  repo: string;
  pull_number: number;
  commit_title?: string;
  commit_message?: string;
  merge_method?: 'merge' | 'squash' | 'rebase';
}

export interface MergePullRequestResult {
  sha: string;
  merged: boolean;
  message: string;
}

export interface GithubPullRequestReader {
  listPullRequests(input: ListPullRequestsInput): Promise<ListPullRequestsResult>;
  getFileContent(input: GetFileContentInput): Promise<GetFileContentResult>;
  createOrUpdateFile(input: CreateOrUpdateFileInput): Promise<CreateOrUpdateFileResult>;
  createPullRequest(input: CreatePullRequestInput): Promise<CreatePullRequestResult>;
  mergePullRequest(input: MergePullRequestInput): Promise<MergePullRequestResult>;
}
