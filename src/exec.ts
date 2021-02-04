import { exec } from '@actions/exec'

const execAndReadAll = async (
  command: string,
  args: string[],
): Promise<string> => {
  let output = ''

  await exec(command, args, {
    listeners: {
      stdout: (data: Buffer) => {
        output += data.toString()
      },
    },
  })

  return output
}

export { exec, execAndReadAll }
