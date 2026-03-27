import { Octokit } from '@octokit/rest';
import { env } from '../../config/env';
import {
  GithubPullRequestReader,
  ListPullRequestsInput,
  ListPullRequestsResult,
  GetFileContentInput,
  GetFileContentResult,
} from '../../application/interfaces/GithubRepository';

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
