import * as core from '@actions/core'

import * as docker from './docker'
import * as heroku from './heroku'
import { createAppEnvironment } from './create-app-environment'
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
    const { freshMainApp, freshHasuraApp } = await createAppEnvironment({
      target,
      envVars,
    })

    let deployingMainApp = false

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

      const targetImage = `registry.heroku.com/${appName}/${processType}`
      await docker.tag({ sourceImage, targetImage })
      await docker.push({ image: targetImage })
      await heroku.releaseContainer({ appName, processTypes: [processType] })

      if (appName === target.hasuraAppName && freshHasuraApp) {
        // wait for database to be seeded before we start hasura
        await heroku.scaleProcesses({
          appName: target.hasuraAppName,
          processes: { [processType]: 0 },
        })
      }

      if (appName === target.mainAppName) {
        await heroku.run({
          appName: target.mainAppName,
          type: 'worker',
          command: ['bundle', 'exec', 'rake', 'db:migrate'],
        })
      }
    }

    if (deployingMainApp && freshMainApp) {
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

main().catch((error) => {
  core.setFailed(error instanceof Error ? error.message : String(error))
})
