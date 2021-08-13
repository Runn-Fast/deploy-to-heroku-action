import fs, { createWriteStream } from 'fs'
import { homedir } from 'os'
import { join as joinPath } from 'path'
import { promisify } from 'util'

import { exec, execAndReadAll } from './exec'
import { EnvVars } from './env-vars'
import { isReviewAppName } from './is-review-app-name'

const writeFile = promisify(fs.writeFile)

type LoginOptions = {
  email: string
  apiKey: string
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
  team: string
}

type GetAppListResult = Array<{
  name: string
}>

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

  return JSON.parse(info) as GetAppListResult
}

type DoesAppExistOptions = {
  appName: string
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
  appName: string
  team: string
  pipelineName: string
  pipelineStage: string
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
  appName: string
}

const destroyApp = async (options: DestroyAppOptions): Promise<void> => {
  const { appName } = options

  // Safety net
  if (!isReviewAppName(appName)) {
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
  appName: string
  addonName: string
  version?: string
  wait?: boolean
}

const createAddon = async (options: CreateAddonOptions): Promise<void> => {
  const { appName, addonName, version, wait } = options

  await exec(
    'heroku',
    [
      'addons:create',
      addonName,
      ['--app', appName],
      typeof version === 'string' ? ['--version', version] : undefined,
      wait === true ? '--wait' : undefined,
    ]
      .filter(Boolean)
      .flat() as string[],
  )
}

type GetEnvVarOptions = {
  appName: string
  varName: string
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
  appName: string
}

const getAllEnvVars = async (
  options: GetAllEnvVarsOptions,
): Promise<EnvVars> => {
  const { appName } = options

  const results = await execAndReadAll(
    'heroku',
    ['config', ['--app', appName], '--json'].flat(),
    {
      // Prevent secrets from being logged to console
      outStream: createWriteStream('/dev/null'),
    },
  )

  return JSON.parse(results) as EnvVars
}

type SetEnvVarOptions = {
  appName: string
  config: Record<string, string>
}

const setEnvVars = async (options: SetEnvVarOptions): Promise<void> => {
  const { appName, config } = options

  const vars = Object.entries(config).map(([key, value]) => `${key}=${value}`)

  await exec('heroku', ['config:set', ...vars, ['--app', appName]].flat())
}

type UnsetEnvVarOptions = {
  appName: string
  varNames: string[]
}

const unsetEnvVars = async (options: UnsetEnvVarOptions): Promise<void> => {
  const { appName, varNames } = options

  await exec('heroku', ['config:unset', ...varNames, ['--app', appName]].flat())
}

type ReleaseContainerOptions = {
  appName: string
  dynoTypes: string[]
}

const releaseContainer = async (
  options: ReleaseContainerOptions,
): Promise<void> => {
  const { appName, dynoTypes } = options

  await exec(
    'heroku',
    ['container:release', ...dynoTypes, ['--app', appName]].flat(),
  )
}

type ScaleDynosToOneOptions = {
  appName: string
  dynoTypes: string[]
}

const scaleDynosToOne = async (
  options: ScaleDynosToOneOptions,
): Promise<void> => {
  const { appName, dynoTypes } = options
  const args = dynoTypes.map((type) => `${type}=1`)

  await exec('heroku', ['ps:scale', ...args, ['--app', appName]].flat())
}

type RunOptions = {
  appName: string
  type: string
  command: string[]
}

const run = async (options: RunOptions): Promise<string> => {
  const { appName, type, command } = options
  const logs = await execAndReadAll(
    'heroku',
    [
      'run',
      '--exit-code',
      '--no-tty',
      '--no-notify',
      ['--app', appName],
      ['--type', type],
      '--',
      ...command,
    ].flat(),
  )
  return logs
}

type GetDynoList = {
  appName: string
}

type DynoStatus = {
  attach_url: string | null
  command: string
  created_at: string // "2021-07-15T00:19:05Z",
  id: string // "0b7fe29b-478a-4be0-a871-0a245898161e",
  name: string // "web.1",
  app: {
    id: string // "182c5784-2c06-4da0-958c-582176609887",
    name: string // "runn-pr-6361-hasura"
  }
  release: {
    id: string // "e9610be5-9e40-4403-9edf-b79b5bd7bd3b",
    version: number
  }
  size: string // "Hobby" | "Standard-2X" | "Performance-L"
  state: 'up'
  type: 'web' | 'worker'
  updated_at: string // "2021-07-15T00:19:05Z"
}

const getDynoList = async (options: GetDynoList): Promise<DynoStatus[]> => {
  const { appName } = options
  const result = await execAndReadAll(
    'heroku',
    ['ps', '--json', ['--app', appName]].flat(),
  )
  return JSON.parse(result) as DynoStatus[]
}

type RestartDynoOptions = {
  appName: string
  dynoType: string
}

const restartDyno = async (options: RestartDynoOptions): Promise<void> => {
  const { appName, dynoType } = options

  await exec('heroku', ['ps:restart', dynoType, ['--app', appName]].flat())
}

type BootDynosOptions = {
  appName: string
  dynoTypes: string[]
  restartIfAlreadyRunning?: boolean
}

const bootDynos = async (options: BootDynosOptions): Promise<void> => {
  const { appName, dynoTypes, restartIfAlreadyRunning } = options
  const dynoList = await getDynoList({ appName })
  const statusList = dynoTypes.map((dynoType) => {
    const isRunning = dynoList.some((d) => d.type === dynoType)
    return { dynoType, isRunning }
  })

  const needsBooting = statusList
    .filter((s) => !s.isRunning)
    .map((s) => s.dynoType)
  if (needsBooting.length > 0) {
    await scaleDynosToOne({ appName, dynoTypes: needsBooting })
  }

  if (restartIfAlreadyRunning) {
    const needsRestarting = statusList
      .filter((s) => s.isRunning)
      .map((s) => s.dynoType)
    await Promise.all(
      needsRestarting.map(async (dynoType) => {
        await restartDyno({ appName, dynoType })
      }),
    )
  }
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
  run,
  getDynoList,
  scaleDynosToOne,
  restartDyno,
  bootDynos,
}
