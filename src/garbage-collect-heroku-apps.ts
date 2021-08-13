import * as github from '@actions/github'

import * as heroku from './heroku'

type GarbageCollectHerokuAppsOptions = {
  githubAPIKey: string
}

const garbageCollectHerokuApps = async (
  options: GarbageCollectHerokuAppsOptions,
): Promise<void> => {
  const { githubAPIKey } = options

  const octokit = github.getOctokit(githubAPIKey)

  const pullRequests = await octokit.paginate(
    'GET /repos/{owner}/{repo}/pulls',
    {
      owner: 'Runn-Fast',
      repo: 'runn',
      state: 'open',
    },
  )

  const openPullRequestIDs = new Set(pullRequests.map((pr) => pr.number))

  const herokuApps = await heroku.getAppList({ team: 'runn' })

  await Promise.all(
    herokuApps.map(async (herokuApp) => {
      const { name } = herokuApp
      const match = /^runn-pr-(\d+)-/.exec(name)
      if (!match || !match[1]) {
        return
      }

      const id = Number.parseInt(match[1], 10)
      if (openPullRequestIDs.has(id)) {
        console.log(`PR ${id} is still open, leaving app "${name}" as is`)
      } else {
        console.log(`PR ${id} has been closed, destroying app "${name}"`)
        await heroku.destroyApp({ appName: name })
      }
    }),
  )
}

export { garbageCollectHerokuApps }
