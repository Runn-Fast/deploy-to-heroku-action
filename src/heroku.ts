import fs from 'fs'
import { promisify } from 'util'
import { homedir } from 'os'
import { join as joinPath } from 'path'
import { createWriteStream } from 'fs'

import { exec, execAndReadAll } from './exec'
import { EnvVars } from './env-vars'

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

type GetAppListOptions = {
  team: string,
}

type GetAppListResult = {
  name: string,
}[]

const getAppList = async (
  options: GetAppListOptions,
): Promise<GetAppListResult> => {
  const { team } = options

  const info = await execAndReadAll(
    'heroku',
    ['apps', '--json', ['--team', team]].flat(),
    {
      outStream: createWriteStream('/dev/null'),
    },
  )

  return JSON.parse(info)
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

type DestroyAppOptions = {
  appName: string,
}

const destroyApp = async (options: DestroyAppOptions): Promise<void> => {
  const { appName } = options

  // safety net
  if (/^runn-pr-\d+-(app|hasura)$/.test(appName) !== true) {
    throw new Error(
      `We should only be destroying temporary development apps, not "${appName}"!`,
    )
  }

  await exec(
    'heroku',
    ['apps:destroy', ['--app', appName], ['--confirm', appName]].flat(),
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

type GetAllEnvVarsOptions = {
  appName: string,
}

const getAllEnvVars = async (
  options: GetAllEnvVarsOptions,
): Promise<EnvVars> => {
  const { appName } = options

  const results = await execAndReadAll(
    'heroku',
    ['config', ['--app', appName], '--json'].flat(),
    {
      // prevent secrets from being logged to console
      outStream: createWriteStream('/dev/null'),
    },
  )

  return JSON.parse(results)
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

type UnsetEnvVarOptions = {
  appName: string,
  varNames: string[],
}

const unsetEnvVars = async (options: UnsetEnvVarOptions): Promise<void> => {
  const { appName, varNames } = options

  await exec('heroku', ['config:unset', ...varNames, ['--app', appName]].flat())
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

type ScaleProcessesOptions = {
  appName: string,
  processes: Record<string, number>,
}

const scaleProcesses = async (
  options: ScaleProcessesOptions,
): Promise<void> => {
  const { appName, processes } = options

  const args = Object.entries(processes).map(
    ([processName, count]) => `${processName}=${count}`,
  )

  await exec('heroku', ['ps:scale', ...args, ['--app', appName]].flat())
}

type RunOptions = {
  appName: string,
  type: string,
  command: string[],
}

const run = async (options: RunOptions): Promise<void> => {
  const { appName, type, command } = options
  await exec(
    'heroku',
    [
      'run',
      '--exit-code',
      ['--app', appName],
      ['--type', type],
      '--',
      ...command,
    ].flat(),
  )
}

export {
  login,
  getAppList,
  doesAppExist,
  createApp,
  destroyApp,
  createAddon,
  getEnvVar,
  getAllEnvVars,
  setEnvVars,
  unsetEnvVars,
  releaseContainer,
  scaleProcesses,
  run,
}
