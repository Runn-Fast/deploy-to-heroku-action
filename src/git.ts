import { exec } from '@actions/exec'
import { createWriteStream } from 'fs'

const findPullRequestId = async (sha: string): Promise<number> => {
  const devNull = createWriteStream('/dev/null')

  let output = ''
  await exec('git', ['ls-remote', 'origin', 'pull/*/head'], {
    outStream: devNull,
    errStream: devNull,
    listeners: {
      stdout: (data: Buffer) => {
        output += data.toString()
      },
    },
  })

  const lines = output.split('\n')
  for (const line of lines) {
    if (line.startsWith(sha)) {
      const match = line.match(/refs\/pull\/(\d+)\//)
      if (match != null) {
        return parseInt(match[1], 10)
      }
    }
  }

  return undefined
}

export { findPullRequestId }
