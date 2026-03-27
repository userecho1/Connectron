export interface GitStatusResult {
  isClean: boolean;
  output: string;
}

export interface GitLogInput {
  maxCount?: number;
  repoPath?: string;
}

export interface GitStatusInput {
  repoPath?: string;
}

export interface GitOperationRepository {
  getStatus(input: GitStatusInput): Promise<GitStatusResult>;
  getLog(input: GitLogInput): Promise<string>;
}
