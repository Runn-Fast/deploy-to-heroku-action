import { exec } from '@actions/exec'

const findPullRequestId = async (sha: string): Promise<number> => {
  let output = ''
  await exec('git', ['ls-remote', 'origin', 'pull/*/head'], {
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
