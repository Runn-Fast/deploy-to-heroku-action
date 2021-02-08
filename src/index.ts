import * as core from '@actions/core'

import * as docker from './docker'
import * as heroku from './heroku'
import { createMainApp, createHasuraApp } from './create-app-environment'
import { garbageCollectHerokuApps } from './garbage-collect-heroku-apps'
import { getDeploymentTargets } from './targets'
import { parseEnvVars } from './env-vars'

const main = async () => {
  const githubAPIKey = core.getInput('github_api_key')
  const herokuEmail = core.getInput('heroku_email')
  const herokuAPIKey = core.getInput('heroku_api_key')

  const rawEnvVars = core.getInput('env_vars')
  const envVars = parseEnvVars(rawEnvVars)

  const rawImages = core.getInput('images')
  const images = rawImages.split(',').map((image) => image.trim())

  await heroku.login({
    email: herokuEmail,
    apiKey: herokuAPIKey,
  })

  await garbageCollectHerokuApps({ githubAPIKey })

  const targets = await getDeploymentTargets()
  console.dir({ targets }, { depth: null })

  for (const target of targets) {
    let deployingMainApp = false
    let freshMainApp = false

    for (const sourceImage of images) {
      const [appType, processType] = sourceImage.split('_')

      let appName: string
      switch (appType) {
        case 'app':
          appName = target.mainAppName
          deployingMainApp = true
          break
        case 'hasura':
          appName = target.hasuraAppName
          break
        default:
          throw new Error(`Unsupported app type: "${appType}"`)
      }

      let freshApp: boolean
      switch (appName) {
        case target.mainAppName:
          freshApp = await createMainApp({ target, envVars })
          if (freshApp) {
            freshMainApp = true
          }
          break
        case target.hasuraAppName:
          freshApp = await createHasuraApp({ target, envVars })
          break
        default:
          throw new Error(`Unsupported app name: "${appName}"`)
      }

      const targetImage = `registry.heroku.com/${appName}/${processType}`
      await docker.tag({ sourceImage, targetImage })
      await docker.push({ image: targetImage })
      await heroku.releaseContainer({ appName, processTypes: [processType] })

      if (freshApp) {
        // wait for database to be seeded before we start hasura
        await heroku.scaleProcesses({
          appName,
          processes: { [processType]: 0 },
        })
      }
    }

    if (deployingMainApp) {
      await heroku.run({
        appName: target.mainAppName,
        type: 'worker',
        command: ['bundle', 'exec', 'rake', 'db:migrate'],
      })

      if (freshMainApp) {
        await heroku.run({
          appName: target.mainAppName,
          type: 'worker',
          command: ['bundle', 'exec', 'rake', 'db:seed'],
        })
        await heroku.scaleProcesses({
          appName: target.mainAppName,
          processes: { web: 1, worker: 1 },
        })
        await heroku.scaleProcesses({
          appName: target.hasuraAppName,
          processes: { web: 1 },
        })
      }
    }
  }
}

main().catch((error) => {
  core.setFailed(error instanceof Error ? error.message : String(error))
})
