import * as heroku from './heroku'
import { Target } from './targets'
import { randomHex } from './crypto'
import { isEmptyString } from './utils'
import { EnvVars } from './env-vars'

type CreateAppEnviromentOptions = {
  target: Target,
  envVars: EnvVars,
}

type CreateAppEnviromentResult = {
  freshMainApp: boolean,
  freshHasuraApp: boolean,
}

const createAppEnvironment = async (
  options: CreateAppEnviromentOptions,
): Promise<CreateAppEnviromentResult> => {
  const { target, envVars } = options

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

    const jwtSecret = randomHex(64)
    const secretKeyBase = randomHex(64)

    await heroku.setEnvVars({
      appName: mainAppName,
      config: {
        ...envVars,
        HASURA_JWT_SECRET: jwtSecret,
        SECRET_KEY_BASE: secretKeyBase,
      },
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

    const jwtSecret = await heroku.getEnvVar({
      appName: mainAppName,
      varName: 'HASURA_JWT_SECRET',
    })
    if (isEmptyString(jwtSecret)) {
      throw new Error(
        `The '${mainAppName}' Heroku app does not have a HASURA_JWT_SECRET env var!`,
      )
    }

    const databaseUrl = await heroku.getEnvVar({
      appName: mainAppName,
      varName: 'DATABASE_URL',
    })
    if (isEmptyString(databaseUrl)) {
      throw new Error(
        `The '${mainAppName}' Heroku app does not have a DATABASE_URL env var!`,
      )
    }

    await heroku.setEnvVars({
      appName: hasuraAppName,
      config: {
        HASURA_GRAPHQL_DATABASE_URL: databaseUrl,
        HASURA_GRAPHQL_ADMIN_SECRET: envVars.HASURA_ADMIN_SECRET,
        HASURA_GRAPHQL_DEV_MODE: 'true',
        HASURA_GRAPHQL_ENABLE_CONSOLE: 'true',
        HASURA_GRAPHQL_ENABLE_TELEMETRY: 'false',
        HASURA_GRAPHQL_JWT_SECRET: `{ "type": "HS256", "key": "${jwtSecret}", "claims_format": "json" }`,
        ACTIONS_BASE_URL: `https://${mainAppName}.herokuapp.com`,
      },
    })
  }

  return {
    freshMainApp: !mainAppExists,
    freshHasuraApp: !hasuraAppExists,
  }
}

export { createAppEnvironment }
