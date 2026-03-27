import { exec } from 'child_process';
import { promisify } from 'util';
import { GitOperationRepository, GitStatusResult, GitStatusInput, GitLogInput } from '../../application/interfaces/GitRepository.js';

const execAsync = promisify(exec);

export class GitService implements GitOperationRepository {
  async getStatus(input: GitStatusInput): Promise<GitStatusResult> {
    const cwd = input.repoPath || process.cwd();
    try {
      const { stdout } = await execAsync('git status --short', { cwd });
      const output = stdout.trim();
      return {
        isClean: output === '',
        output: output || 'Working tree clean'
      };
    } catch (error: any) {
      throw new Error(`Failed to get git status: ${error.message}`);
    }
  }

  async getLog(input: GitLogInput): Promise<string> {
    const cwd = input.repoPath || process.cwd();
    const count = input.maxCount || 10;
    try {
      const { stdout } = await execAsync(`git log -n ${count} --oneline`, { cwd });
      return stdout.trim() || 'No commits yet';
    } catch (error: any) {
      throw new Error(`Failed to get git log: ${error.message}`);
    }
  }

  async add(input: { repoPath?: string; filePattern?: string }): Promise<string> {
    const cwd = input.repoPath || process.cwd();
    const target = input.filePattern || '.';
    const { stdout } = await execAsync(`git add ${target}`, { cwd });
    return stdout.trim() || 'git add success';
  }

  async commit(input: { repoPath?: string; message: string }): Promise<string> {
    const cwd = input.repoPath || process.cwd();
    const { stdout } = await execAsync(`git commit -m "${input.message.replace(/"/g, '\\"')}"`, { cwd });
    return stdout.trim();
  }

  async push(input: { repoPath?: string; remote?: string; branch?: string }): Promise<string> {
    const cwd = input.repoPath || process.cwd();
    const remote = input.remote || 'origin';
    const branch = input.branch || 'main';
    const { stdout } = await execAsync(`git push ${remote} ${branch}`, { cwd });
    return stdout.trim();
  }

  async pull(input: { repoPath?: string; remote?: string; branch?: string }): Promise<string> {
    const cwd = input.repoPath || process.cwd();
    const remote = input.remote || 'origin';
    const branch = input.branch || 'main';
    const { stdout } = await execAsync(`git pull ${remote} ${branch}`, { cwd });
    return stdout.trim();
  }

  async checkout(input: { repoPath?: string; branch: string }): Promise<string> {
    const cwd = input.repoPath || process.cwd();
    const { stdout } = await execAsync(`git checkout ${input.branch}`, { cwd });
    return stdout.trim();
  }
}

export function buildGitService(): GitService {
  return new GitService();
}
