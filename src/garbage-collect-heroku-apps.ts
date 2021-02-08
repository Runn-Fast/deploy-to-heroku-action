import * as github from '@actions/github'

import * as heroku from './heroku'

type GarbageCollectHerokuAppsOptions = {
  githubAPIKey: string,
}

const garbageCollectHerokuApps = async (
  options: GarbageCollectHerokuAppsOptions,
): Promise<void> => {
  const { githubAPIKey } = options

  const octokit = github.getOctokit(githubAPIKey)

  const { data: pullRequests } = await octokit.request(
    'GET /repos/{owner}/{repo}/pulls',
    {
      owner: 'Runn-Fast',
      repo: 'runn',
      state: 'open',
    },
  )

  const openPullRequestIDs = pullRequests.map((pr) => pr.number)

  const herokuApps = await heroku.getAppList({ team: 'runn' })

  for (const herokuApp of herokuApps) {
    const { name } = herokuApp
    const match = /^runn-pr-(\d+)-/.exec(name)
    if (match == null) {
      continue
    }
    const id = parseInt(match[1], 10)
    if (openPullRequestIDs.includes(id)) {
      console.log(`PR ${id} is still open, leaving app "${name}" as is`)
    } else {
      console.log(`PR ${id} has been closed, destroying app "${name}"`)
      await heroku.destroyApp({ appName: name })
    }
  }
}

export { garbageCollectHerokuApps }
