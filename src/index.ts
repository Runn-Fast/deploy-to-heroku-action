import * as core from '@actions/core'

import * as docker from './docker'
import * as heroku from './heroku'
import { createMainApp, createHasuraApp } from './create-app-environment'
import { garbageCollectHerokuApps } from './garbage-collect-heroku-apps'
import { getDeploymentTargets } from './targets'
import { parseEnvVars } from './env-vars'
import { setCommitEnvVar } from './set-commit-env-var'
import {
  createGithubDeployment,
  setGithubDeploymentStatus,
  GithubDeploymentState,
} from './github-deployments'

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
    let deployingHasuraApp = false
    let freshMainApp = false
    let freshHasuraApp = false

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
          deployingHasuraApp = true
          break
        default:
          throw new Error(`Unsupported app type: "${appType}"`)
      }

      switch (appName) {
        case target.mainAppName: {
          const freshApp = await createMainApp({ target, envVars })
          if (freshApp) {
            freshMainApp = true
          }
          break
        }
        case target.hasuraAppName: {
          const freshApp = await createHasuraApp({ target, envVars })
          if (freshApp) {
            freshHasuraApp = true
          }
          break
        }
        default: {
          throw new Error(`Unsupported app name: "${appName}"`)
        }
      }

      const targetImage = `registry.heroku.com/${appName}/${processType}`
      await docker.tag({ sourceImage, targetImage })
      await docker.push({ image: targetImage })
    }

    if (deployingHasuraApp) {
      await heroku.releaseContainer({
        appName: target.hasuraAppName,
        processTypes: ['web'],
      })
      await setCommitEnvVar({
        appName: target.hasuraAppName,
        commitSHA: target.commitSHA,
      })

      if (freshHasuraApp) {
        // wait for database to be seeded before we start hasura
        await heroku.scaleProcesses({
          appName: target.hasuraAppName,
          processes: { web: 0 },
        })
      }
    }

    if (deployingMainApp) {
      await heroku.releaseContainer({
        appName: target.mainAppName,
        processTypes: ['web', 'worker'],
      })
      await setCommitEnvVar({
        appName: target.mainAppName,
        commitSHA: target.commitSHA,
      })

      const logs = await heroku.run({
        appName: target.mainAppName,
        type: 'worker',
        command: ['bundle', 'exec', 'rake', 'db:migrate'],
      })
      const databaseHasChanged = / migrating =/.test(logs)

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
      } else if (databaseHasChanged) {
        await heroku.restartProcess({
          appName: target.mainAppName,
          processName: 'web',
        })

        await heroku.restartProcess({
          appName: target.mainAppName,
          processName: 'worker',
        })
      }

      if (target.hasPullRequest) {
        const deploymentId = await createGithubDeployment({
          githubAPIKey,
          ref: target.commitSHA,
        })
        await setGithubDeploymentStatus({
          githubAPIKey,
          ref: target.commitSHA,
          deploymentId,
          state: GithubDeploymentState.SUCCESS,
          environmentUrl: target.mainAppUrl,
        })
      }
    }
  }
}

main().catch((error) => {
  core.setFailed(error instanceof Error ? error.message : String(error))
})
