import { exec, ExecOptions } from '@actions/exec';
declare const execAndReadAll: (command: string, args: string[], options?: ExecOptions | undefined) => Promise<string>;
export { exec, execAndReadAll };
