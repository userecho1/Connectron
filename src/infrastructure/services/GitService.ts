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
}

export function buildGitService(): GitService {
  return new GitService();
}
