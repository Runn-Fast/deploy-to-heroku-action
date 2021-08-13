import * as core from '@actions/core'

import * as docker from './docker'
import * as heroku from './heroku'
import { createMainApp, createHasuraApp } from './create-app-environment'
import { garbageCollectHerokuApps } from './garbage-collect-heroku-apps'
import { getDeploymentTargets } from './targets'
import { parseEnvVars } from './env-vars'
import { setCommitEnvVar } from './set-commit-env-var'
import { isReviewAppName } from './is-review-app-name'
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

  await Promise.all(
    targets.map(async (target) => {
      let deployingMainApp = false
      let freshMainApp = false

      await Promise.all(
        images.map(async (sourceImage) => {
          const [appType, dynoType] = sourceImage.split('_')
          if (!appType || !dynoType) {
            throw new Error(
              `Could not read appType/dynoType from sourceImage: ${sourceImage}`,
            )
          }

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
        }),
      )

      if (deployingMainApp) {
        /** RELEASE MAIN APP */

        await heroku.releaseContainer({
          appName: target.mainAppName,
          dynoTypes: ['web', 'worker'],
        })

        await setCommitEnvVar({
          appName: target.mainAppName,
          commitSHA: target.commitSHA,
        })

        const migrateLogs = await heroku.run({
          appName: target.mainAppName,
          type: 'worker',
          command: ['bundle', 'exec', 'rake', 'db:migrate'],
        })
        const databaseHasChanged = migrateLogs.includes(' migrating =')

        if (freshMainApp) {
          if (!isReviewAppName(target.mainAppName)) {
            throw new Error(
              `Nearly tried to re-seed "${target.mainAppName}" -- that isn't a review app!`,
            )
          }

          await heroku.run({
            appName: target.mainAppName,
            type: 'worker',
            command: ['bundle', 'exec', 'rake', 'db:seed'],
          })
        }

        await heroku.bootDynos({
          appName: target.mainAppName,
          dynoTypes: ['web', 'worker'],
          restartIfAlreadyRunning: databaseHasChanged,
        })

        /** RELEASE HASURA **/

        await heroku.releaseContainer({
          appName: target.hasuraAppName,
          dynoTypes: ['web'],
        })

        await setCommitEnvVar({
          appName: target.hasuraAppName,
          commitSHA: target.commitSHA,
        })

        await heroku.bootDynos({
          appName: target.hasuraAppName,
          dynoTypes: ['web'],
          restartIfAlreadyRunning: false,
        })

        /** UPDATE PULL REQUEST **/

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
    }),
  )
}

main().catch((error) => {
  core.setFailed(error instanceof Error ? error.message : String(error))
})
