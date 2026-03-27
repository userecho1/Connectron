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
  add(input: { repoPath?: string; filePattern?: string }): Promise<string>;
  commit(input: { repoPath?: string; message: string }): Promise<string>;
  push(input: { repoPath?: string; remote?: string; branch?: string }): Promise<string>;
  pull(input: { repoPath?: string; remote?: string; branch?: string }): Promise<string>;
  checkout(input: { repoPath?: string; branch: string }): Promise<string>;
}
