import * as core from '@actions/core'
import * as github from '@actions/github'

import * as heroku from './heroku'
import * as docker from './docker'

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
  const herokuEmail = core.getInput('heroku_email')
  const herokuAPIKey = core.getInput('heroku_api_key')

  await heroku.login({
    email: herokuEmail,
    apiKey: herokuAPIKey,
  })

  const targets = await getDeploymentTargets()
  console.dir({ targets }, { depth: null })

  for (const target of targets) {
    await createAppEnvironment(target)
  }

  const images = core
    .getInput('images')
    .split(',')
    .map((image) => image.trim())

  for (const sourceImage of images) {
    const [appType, processType] = sourceImage.split('_')

    let appName: string
    switch (appType) {
      case 'app':
        appName = targets[0].mainAppName
        break
      case 'hasura':
        appName = targets[0].hasuraAppName
        break
      default:
        throw new Error(`Unsupported app type: "${appType}"`)
    }

    const targetImage = `registry.heroku.com/${appName}/${processType}`
    await docker.tag({ sourceImage, targetImage })
    await docker.push({ image: targetImage })
    await heroku.releaseContainer({ appName, processTypes: [processType] })
  }
}

main().catch((error) => {
  core.setFailed(error instanceof Error ? error.message : String(error))
})
