import fs from 'fs'
import { promisify } from 'util'
import { homedir } from 'os'
import { join as joinPath } from 'path'

import { exec, execAndReadAll } from './exec'

const writeFile = promisify(fs.writeFile)

type LoginOptions = {
  email: string,
  apiKey: string,
}

const login = async (options: LoginOptions): Promise<void> => {
  const { email, apiKey } = options

  const netrcFilepath = joinPath(homedir(), '.netrc')

  const netrc = `machine api.heroku.com
    login ${email}
    password ${apiKey}
machine git.heroku.com
    login ${email}
    password ${apiKey}`

  await writeFile(netrcFilepath, netrc)

  console.log(`Created and wrote to ${netrcFilepath}`)
  await exec('heroku', ['container:login'])
}

type DoesAppExistOptions = {
  appName: string,
}

const doesAppExist = async (options: DoesAppExistOptions): Promise<boolean> => {
  const { appName } = options

  try {
    await exec('heroku', ['apps:info', ['--app', appName]].flat())
    return true
  } catch {
    return false
  }
}

type CreateAppOptions = {
  appName: string,
  team: string,
  pipelineName: string,
  pipelineStage: string,
}

const createApp = async (options: CreateAppOptions): Promise<void> => {
  const { appName, team, pipelineName, pipelineStage } = options

  await exec(
    'heroku',
    [
      'apps:create',
      appName,
      ['--team', team],
      '--no-remote',
      '--stack=container',
    ].flat(),
  )

  await exec(
    'heroku',
    [
      'pipelines:add',
      pipelineName,
      ['--stage', pipelineStage],
      ['--app', appName],
    ].flat(),
  )
}

type CreateAddonOptions = {
  appName: string,
  addonName: string,
  version?: string,
  wait?: boolean,
}

const createAddon = async (options: CreateAddonOptions): Promise<void> => {
  const { appName, addonName, version, wait } = options

  await exec(
    'heroku',
    [
      'addons:create',
      addonName,
      ['--app', appName],
      version != null ? ['--version', version] : undefined,
      wait === true ? '--wait' : undefined,
    ]
      .filter(Boolean)
      .flat(),
  )
}

type GetEnvVarOptions = {
  appName: string,
  varName: string,
}

const getEnvVar = async (options: GetEnvVarOptions): Promise<string> => {
  const { appName, varName } = options

  const value = await execAndReadAll(
    'heroku',
    ['config:get', varName, ['--app', appName]].flat(),
  )

  return value.trim()
}

type SetEnvVarOptions = {
  appName: string,
  config: Record<string, string>,
}

const setEnvVars = async (options: SetEnvVarOptions): Promise<void> => {
  const { appName, config } = options

  const vars = Object.entries(config).map(([key, value]) => {
    return `${key}=${value}`
  })

  await exec('heroku', ['config:set', ...vars, ['--app', appName]].flat())
}

type ReleaseContainerOptions = {
  appName: string,
  processTypes: string[],
}

const releaseContainer = async (
  options: ReleaseContainerOptions,
): Promise<void> => {
  const { appName, processTypes } = options

  await exec(
    'heroku',
    ['container:release', ...processTypes, ['--app', appName]].flat(),
  )
}

type ScaleDynosOptions = {
  appName: string,
  dynos: [string, number][],
}

const scaleDynos = async (options: ScaleDynosOptions): Promise<void> => {
  const { appName, dynos } = options

  const dynoArgs = dynos.map(
    ([processName, count]) => `${processName}=${count}`,
  )

  await exec('heroku', ['ps:scale', ...dynoArgs, ['--app', appName]].flat())
}

// heroku run bundle exec rake db:migrate --app "${{ env.PARENT_APP_NAME }}" --type worker
//
// if [[ "${{ env.APP_IS_PRODUCTION }}" == "false" ]]; then
//   heroku run bundle exec rake db:seed --app "${{ env.PARENT_APP_NAME }}" --type worker
// fi

export {
  login,
  doesAppExist,
  createApp,
  createAddon,
  getEnvVar,
  setEnvVars,
  releaseContainer,
  scaleDynos,
}
