import * as core from '@actions/core'
import * as github from '@actions/github'

import * as heroku from './heroku'

const { GITHUB_REF } = process.env

type Target = {
  mainAppName: string,
  hasuraAppName: string,
  isProduction: boolean,
}

const getDeploymentTargets = async (): Promise<Target[]> => {
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
      const pullRequestId = github.context.payload.number

      if (pullRequestId == null) {
        throw new Error(`Could not find Pull Request ID in github.context`)
      }

      return [
        {
          mainAppName: `runn-review-pr-${pullRequestId}`,
          hasuraAppName: `runn-hasura-pr-${pullRequestId}`,
          isProduction: false,
        },
      ]
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
  await heroku.login({
    email: core.getInput('heroku_email'),
    apiKey: core.getInput('heroku_api_key'),
  })

  const targets = await getDeploymentTargets()
  console.dir({ targets }, { depth: null })

  for (const target of targets) {
    await createAppEnvironment(target)
  }
}

main().catch((error) => {
  core.setFailed(error instanceof Error ? error.message : String(error))
})
