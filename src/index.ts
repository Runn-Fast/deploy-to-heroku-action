import * as core from '@actions/core'

import * as heroku from './heroku'
import { isEmptyString } from './utils'

console.dir(process.env, { depth: 1 })

const { GITHUB_EVENT_NAME, GITHUB_REF } = process.env

type Target = {
  mainAppName: string,
  hasuraAppName: string,
  isProduction: boolean,
}

const getDeploymentTargets = (): Target[] => {
  switch (GITHUB_EVENT_NAME) {
    case 'pull_request':
      const pullRequestId = ''

      if (isEmptyString(pullRequestId)) {
        throw new Error('Could not find the Github Pull Request ID.')
      }
      return [
        {
          mainAppName: `runn-review-pr-${pullRequestId}`,
          hasuraAppName: `runn-hasura-pr-${pullRequestId}`,
          isProduction: false,
        },
      ]
    case 'push':
      switch (GITHUB_REF) {
        case 'refs/heads/test':
          return [
            {
              mainAppName: 'runn-app-test',
              hasuraAppName: 'runn-hasura-test',
              isProduction: false,
            },
          ]
        case 'refs/heads/development':
          return [
            {
              mainAppName: 'runn-app-staging',
              hasuraAppName: 'runn-hasura-staging',
              isProduction: false,
            },
          ]
        case 'refs/heads/production':
          return [
            {
              mainAppName: 'runn-app-production',
              hasuraAppName: 'runn-hasura-production',
              isProduction: true,
            },
          ]
        default:
          throw new Error(`Unknown github.ref: "${GITHUB_REF}"`)
      }
    default:
      throw new Error(`Unhandled github.event_name: "${GITHUB_EVENT_NAME}"`)
  }
}

const createAppEnvironment = async (target: Target) => {
  const { mainAppName } = target

  const mainAppExists = await heroku.doesAppExist({ appName: mainAppName })
  if (!mainAppExists) {
    await heroku.createApp({
      appName: mainAppName,
      team: 'runn',
      pipelineName: 'runn-app',
      pipelineStage: 'development',
    })
    await heroku.createAddon({
      appName: mainAppName,
      addonName: 'rediscloud:30',
    })
    await heroku.createAddon({
      appName: mainAppName,
      addonName: 'heroku-postgresql:hobby-dev',
      version: '12',
      wait: true,
    })

    const databaseUrl = heroku.getEnvVar({
      appName: mainAppName,
      varName: 'DATABASE_URL',
    })

    console.log({ databaseUrl })
  }
}

const main = async () => {
  const targets = await getDeploymentTargets()
  for (const target of targets) {
    await createAppEnvironment(target)
  }
}

main().catch((error) => {
  core.setFailed(error instanceof Error ? error.message : String(error))
})
