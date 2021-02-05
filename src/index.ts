import * as core from '@actions/core'
import * as github from '@actions/github'

import * as heroku from './heroku'
import * as docker from './docker'
import { isEmptyString } from './utils'

const { GITHUB_REF } = process.env

type Target = {
  mainAppName: string,
  hasuraAppName: string,
  team: string,
  pipelineName: string,
  pipelineStage: string,
  createAppIfNotExists: boolean,
}

const getDeploymentTargets = async (): Promise<Target[]> => {
  const team = 'runn'
  const pipelineName = 'runn-app'

  switch (GITHUB_REF) {
    case 'refs/heads/development':
      return [
        {
          mainAppName: 'runn-app-staging',
          hasuraAppName: 'runn-hasura-staging',
          team,
          pipelineName,
          pipelineStage: 'staging',
          createAppIfNotExists: false,
        },
      ]
    case 'refs/heads/production':
      return [
        {
          mainAppName: 'runn-app-production',
          hasuraAppName: 'runn-hasura-production',
          team,
          pipelineName,
          pipelineStage: 'production',
          createAppIfNotExists: false,
        },
      ]
    default:
      const pullRequestId = github.context.payload.number

      if (pullRequestId == null) {
        throw new Error(`Could not find Pull Request ID in github.context`)
      }

      return [
        {
          mainAppName: `runn-pr-${pullRequestId}-app`,
          hasuraAppName: `runn-pr-${pullRequestId}-hasura`,
          team,
          pipelineName,
          pipelineStage: 'development',
          createAppIfNotExists: true,
        },
      ]
  }
}

const createAppEnvironment = async (target: Target) => {
  const {
    mainAppName,
    hasuraAppName,
    team,
    pipelineName,
    pipelineStage,
    createAppIfNotExists,
  } = target

  const mainAppExists = await heroku.doesAppExist({ appName: mainAppName })
  const hasuraAppExists = await heroku.doesAppExist({ appName: hasuraAppName })

  if (!mainAppExists) {
    if (!createAppIfNotExists) {
      throw new Error(
        `The heroku app "${mainAppExists}" does not exist and createAppIfNotExists is set to false for this environment`,
      )
    }

    await heroku.createApp({
      appName: mainAppName,
      team,
      pipelineName,
      pipelineStage,
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
  }

  if (!hasuraAppExists) {
    if (!createAppIfNotExists) {
      throw new Error(
        `The heroku app "${hasuraAppExists}" does not exist and createAppIfNotExists is set to false for this environment`,
      )
    }

    await heroku.createApp({
      appName: hasuraAppName,
      team,
      pipelineName,
      pipelineStage,
    })

    let jwtSecret = await heroku.getEnvVar({
      appName: mainAppName,
      varName: 'HASURA_JWT_SECRET',
    })
    let databaseUrl = await heroku.getEnvVar({
      appName: mainAppName,
      varName: 'DATABASE_URL',
    })

    if (isEmptyString(jwtSecret)) {
      console.log(
        `Warning: The '${mainAppName}' Heroku app does not have a HASURA_JWT_SECRET env var!`,
      )
      jwtSecret = 'please_update_me'
    }

    if (isEmptyString(databaseUrl)) {
      console.log(
        `Warning: The '${mainAppName}' Heroku app does not have a DATABASE_URL env var!`,
      )
      databaseUrl = 'please_update_me'
    }

    await heroku.setEnvVars({
      appName: mainAppName,
      config: {
        HASURA_JWT_SECRET: jwtSecret,
        DATABASE_URL: databaseUrl,
      },
    })
  }
}

const main = async () => {
  const githubAPIKey = core.getInput('github_api_key')
  const octokit = github.getOctokit(githubAPIKey)

  const { data: pullRequests } = await octokit.request(
    'GET /repos/{owner}/{repo}/pulls',
    {
      owner: 'Runn-Fast',
      repo: 'runn',
      state: 'open',
    },
  )

  console.log(
    'Open Pull Request IDs:',
    pullRequests.map((pr) => pr.number),
  )

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
