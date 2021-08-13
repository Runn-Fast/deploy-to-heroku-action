import { exec, ExecOptions } from '@actions/exec'

const execAndReadAll = async (
  command: string,
  args: string[],
  options?: ExecOptions,
): Promise<string> => {
  let output = ''

  await exec(command, args, {
    ...options,
    listeners: {
      ...options?.listeners,
      stdout: (data: Buffer) => {
        output += data.toString()
      },
    },
  })

  return output
}

export { exec, execAndReadAll }
