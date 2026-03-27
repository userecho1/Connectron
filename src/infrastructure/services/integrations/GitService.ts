import { execFile } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import { promisify } from 'util';
import { IGitProvider, GitStatusResult, GitStatusInput, GitLogInput } from '../../../application/interfaces';
import { env } from '../../../config/env.js';

const execFileAsync = promisify(execFile);

export class GitService implements IGitProvider {
  private async resolveRepoPath(repoPath?: string): Promise<string> {
    const configuredPath = env.GIT_REPO_ROOT?.trim();
    const selectedPath = repoPath?.trim() || configuredPath;

    if (!selectedPath) {
      throw new Error('Git repository path is required. Provide repoPath in tool args or set GIT_REPO_ROOT in environment.');
    }

    const cwd = path.resolve(selectedPath);
    if (!existsSync(cwd)) {
      throw new Error(`Git repository path does not exist: ${cwd}`);
    }

    try {
      await execFileAsync('git', ['rev-parse', '--is-inside-work-tree'], { cwd });
      return cwd;
    } catch {
      throw new Error(`Invalid git repository path (not a git work tree): ${cwd}`);
    }
  }

  async getStatus(input: GitStatusInput): Promise<GitStatusResult> {
    const cwd = await this.resolveRepoPath(input.repoPath);
    try {
      const { stdout } = await execFileAsync('git', ['status', '--short'], { cwd });
      const output = stdout.trim();
      return {
        isClean: output === '',
        output: output || 'Working tree clean',
      };
    } catch (error: any) {
      throw new Error(`Failed to get git status: ${error.message}`);
    }
  }

  async getLog(input: GitLogInput): Promise<string> {
    const cwd = await this.resolveRepoPath(input.repoPath);
    const count = String(input.maxCount || 10);
    try {
      const { stdout } = await execFileAsync('git', ['log', '-n', count, '--oneline'], { cwd });
      return stdout.trim() || 'No commits yet';
    } catch (error: any) {
      throw new Error(`Failed to get git log: ${error.message}`);
    }
  }

  async add(input: { repoPath?: string; filePattern?: string }): Promise<string> {
    const cwd = await this.resolveRepoPath(input.repoPath);
    const target = input.filePattern || '.';
    try {
      const { stdout } = await execFileAsync('git', ['add', target], { cwd });
      return stdout.trim() || 'git add success';
    } catch (error: any) {
      throw new Error(`Failed to git add: ${error.message}`);
    }
  }

  async commit(input: { repoPath?: string; message: string }): Promise<string> {
    const cwd = await this.resolveRepoPath(input.repoPath);
    try {
      const { stdout } = await execFileAsync('git', ['commit', '-m', input.message], { cwd });
      return stdout.trim() || 'git commit success';
    } catch (error: any) {
      throw new Error(`Failed to git commit: ${error.message}`);
    }
  }

  async push(input: { repoPath?: string; remote?: string; branch?: string }): Promise<string> {
    const cwd = await this.resolveRepoPath(input.repoPath);
    const remote = input.remote || 'origin';
    const branch = input.branch || 'main';
    try {
      const { stdout } = await execFileAsync('git', ['push', remote, branch], { cwd });
      return stdout.trim() || 'git push success';
    } catch (error: any) {
      throw new Error(`Failed to git push: ${error.message}`);
    }
  }

  async pull(input: { repoPath?: string; remote?: string; branch?: string }): Promise<string> {
    const cwd = await this.resolveRepoPath(input.repoPath);
    const remote = input.remote || 'origin';
    const branch = input.branch || 'main';
    try {
      const { stdout } = await execFileAsync('git', ['pull', remote, branch], { cwd });
      return stdout.trim() || 'git pull success';
    } catch (error: any) {
      throw new Error(`Failed to git pull: ${error.message}`);
    }
  }

  async checkout(input: { repoPath?: string; branch: string }): Promise<string> {
    const cwd = await this.resolveRepoPath(input.repoPath);
    try {
      const { stdout } = await execFileAsync('git', ['checkout', input.branch], { cwd });
      return stdout.trim() || 'git checkout success';
    } catch (error: any) {
      throw new Error(`Failed to git checkout: ${error.message}`);
    }
  }
}

export function buildGitService(): GitService {
  return new GitService();
}

