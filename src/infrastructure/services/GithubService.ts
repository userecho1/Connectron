import { Octokit } from '@octokit/rest';
import { env } from '../../config/env';
import {
  GithubPullRequestReader,
  ListPullRequestsInput,
  ListPullRequestsResult,
  GetFileContentInput,
  GetFileContentResult,
  CreateOrUpdateFileInput,
  CreateOrUpdateFileResult,
  CreatePullRequestInput,
  CreatePullRequestResult,
  MergePullRequestInput,
  MergePullRequestResult,
} from '../../application/interfaces/IGithubProvider';

export class GithubService implements GithubPullRequestReader {
  constructor(private readonly octokit: Octokit) {}

  public async listPullRequests(input: ListPullRequestsInput): Promise<ListPullRequestsResult> {
    const response = await this.octokit.pulls.list({
      owner: input.owner,
      repo: input.repo,
      state: input.state ?? 'open',
      sort: input.sort ?? 'updated',
      direction: input.direction ?? 'desc',
      per_page: input.perPage ?? 20,
      page: input.page ?? 1,
    });

    const pullRequests = response.data.map((pr) => ({
      number: pr.number,
      title: pr.title,
      state: pr.state,
      author: pr.user?.login ?? 'unknown',
      url: pr.html_url,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      headRef: pr.head.ref,
      baseRef: pr.base.ref,
    }));

    return {
      items: pullRequests,
      totalCount: pullRequests.length,
      page: input.page ?? 1,
      perPage: input.perPage ?? 20,
    };
  }

  public async getFileContent(input: GetFileContentInput): Promise<GetFileContentResult> {
    const response = await this.octokit.repos.getContent({
      owner: input.owner,
      repo: input.repo,
      path: input.path,
      ref: input.ref,
    });

    if (!('content' in response.data) || !response.data.content) {
      throw new Error(`File content not found for ${input.owner}/${input.repo}/${input.path}`);
    }

    const encoding = response.data.encoding ?? 'base64';
    const raw = response.data.content;
    const content = Buffer.from(raw, encoding as BufferEncoding).toString('utf-8');

    return {
      path: response.data.path ?? input.path,
      sha: response.data.sha,
      url: response.data.html_url ?? response.data.url ?? '',
      encoding,
      content,
    };
  }

  public async createOrUpdateFile(input: CreateOrUpdateFileInput): Promise<CreateOrUpdateFileResult> {
    const response = await this.octokit.repos.createOrUpdateFileContents({
      owner: input.owner,
      repo: input.repo,
      path: input.path,
      message: input.message,
      content: Buffer.from(input.content, 'utf-8').toString('base64'),
      sha: input.sha,
      branch: input.branch,
    });

    if (!response.data.content || !response.data.commit) {
      throw new Error('Failed to create or update file content.');
    }

    return {
      content: {
        path: response.data.content.path ?? input.path,
        sha: response.data.content.sha ?? '',
        url: response.data.content.html_url ?? '',
      },
      commit: {
        sha: response.data.commit.sha ?? '',
        message: response.data.commit.message ?? '',
      },
    };
  }

  public async createPullRequest(input: CreatePullRequestInput): Promise<CreatePullRequestResult> {
    const response = await this.octokit.pulls.create({
      owner: input.owner,
      repo: input.repo,
      title: input.title,
      head: input.head,
      base: input.base,
      body: input.body,
    });

    return {
      id: response.data.id,
      number: response.data.number,
      url: response.data.html_url,
      title: response.data.title,
      base: response.data.base.ref,
      head: response.data.head.ref,
    };
  }

  public async mergePullRequest(input: MergePullRequestInput): Promise<MergePullRequestResult> {
    const response = await this.octokit.pulls.merge({
      owner: input.owner,
      repo: input.repo,
      pull_number: input.pull_number,
      commit_title: input.commit_title,
      commit_message: input.commit_message,
      merge_method: input.merge_method,
    });

    return {
      sha: response.data.sha,
      merged: response.data.merged,
      message: response.data.message,
    };
  }
}

export function buildGithubServiceFromEnv(): GithubService {
  if (!env.GITHUB_TOKEN) {
    throw new Error('Missing GitHub configuration: GITHUB_TOKEN is required.');
  }

  const octokit = new Octokit({
    auth: env.GITHUB_TOKEN,
  });

  return new GithubService(octokit);
}
