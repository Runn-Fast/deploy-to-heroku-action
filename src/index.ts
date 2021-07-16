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
    let freshMainApp = false

    for (const sourceImage of images) {
      const [appType, dynoType] = sourceImage.split('_')

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

      switch (appName) {
        case target.mainAppName: {
          const freshApp = await createMainApp({ target, envVars })
          if (freshApp) {
            freshMainApp = true
          }
          break
        }
        case target.hasuraAppName: {
          await createHasuraApp({ target, envVars })
          break
        }
        default: {
          throw new Error(`Unsupported app name: "${appName}"`)
        }
      }

      const targetImage = `registry.heroku.com/${appName}/${dynoType}`
      await docker.tag({ sourceImage, targetImage })
      await docker.push({ image: targetImage })
    }

    if (deployingMainApp) {
      await heroku.releaseContainer({
        appName: target.hasuraAppName,
        dynoTypes: ['web'],
      })
      await heroku.releaseContainer({
        appName: target.mainAppName,
        dynoTypes: ['web', 'worker'],
      })

      await setCommitEnvVar({
        appName: target.mainAppName,
        commitSHA: target.commitSHA,
      })
      await setCommitEnvVar({
        appName: target.hasuraAppName,
        commitSHA: target.commitSHA,
      })

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
      }

      await heroku.bootOrRestartDynos({
        appName: target.mainAppName,
        dynoTypes: ['web', 'worker'],
      })

      await heroku.bootOrRestartDynos({
        appName: target.hasuraAppName,
        dynoTypes: ['web'],
      })

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
