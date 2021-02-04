import { exec } from '@actions/exec'
import fs from 'fs'
import { promisify } from 'util'
import { homedir } from 'os'
import { join as joinPath } from 'path'

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
  await exec('heroku login')
}

type DoesAppExistOptions = {
  appName: string,
}

const doesAppExist = async (options: DoesAppExistOptions): Promise<boolean> => {
  const { appName } = options

  try {
    await exec('heroku', ['apps:info', `--app="${appName}"`])
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

  await exec('heroku', [
    'apps:create',
    `"${appName}"`,
    `--team="${team}"`,
    '--no-remote',
    '--stack=container',
  ])

  await exec('heroku', [
    'pipelines:add',
    `"${pipelineName}"`,
    `--stage="${pipelineStage}"`,
    `--app="${appName}"`,
  ])
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
      `"${addonName}"`,
      `--app="${appName}"`,
      version != null ? `--version="${version}"` : undefined,
      wait === true ? '--wait' : undefined,
    ].filter(Boolean),
  )
}

type GetEnvVarOptions = {
  appName: string,
  varName: string,
}

const getEnvVar = async (options: GetEnvVarOptions): Promise<string> => {
  const { appName, varName } = options

  let output = ''

  await exec('heroku', ['config:get', `"${varName}"`, `--app="${appName}"`], {
    listeners: {
      stdout: (data: Buffer) => {
        output += data.toString()
      },
    },
  })
  return output
}

export { login, doesAppExist, createApp, createAddon, getEnvVar }
