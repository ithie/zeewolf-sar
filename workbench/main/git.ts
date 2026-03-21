import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function getBranch(cwd: string): Promise<string> {
  const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd });
  return stdout.trim();
}

export async function pull(cwd: string): Promise<string> {
  const { stdout, stderr } = await execAsync('git pull', { cwd });
  return (stdout + stderr).trim();
}

export async function commit(cwd: string, message: string): Promise<string> {
  const { stdout, stderr } = await execAsync(
    `git add -A && git commit -m ${JSON.stringify(message)}`,
    { cwd }
  );
  return (stdout + stderr).trim();
}

export async function push(cwd: string): Promise<string> {
  const { stdout, stderr } = await execAsync('git push', { cwd });
  return (stdout + stderr).trim();
}
