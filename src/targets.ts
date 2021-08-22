import * as github from '@actions/github'

type Target = {
  commitSHA: string,
  mainAppName: string,
  mainAppUrl: string,
  hasuraAppName: string,
  team: string,
  pipelineName: string,
  pipelineStage: string,
  createAppIfNotExists: boolean,
  hasPullRequest: boolean,
}

const getDeploymentTargets = async (): Promise<Target[]> => {
  const team = 'runn'
  const pipelineName = 'runn-app'

  switch (github.context.eventName) {
    case 'push': {
      const commitSHA = github.context.sha

      switch (github.context.ref) {
        case 'refs/heads/development': {
          return [
            {
              commitSHA,
              mainAppName: 'runn-staging-us-app',
              mainAppUrl: 'https://runn-staging-us-app.herokuapp.com',
              hasuraAppName: 'runn-staging-us-hasura',
              team,
              pipelineName,
              pipelineStage: 'staging',
              createAppIfNotExists: false,
              hasPullRequest: false,
            },
          ]
        }
        case 'refs/heads/production': {
          return [
            {
              commitSHA,
              mainAppName: 'runn-prod-eu-app',
              mainAppUrl: 'https://runn-prod-eu-app.herokuapp.com',
              hasuraAppName: 'runn-prod-eu-hasura',
              team,
              pipelineName,
              pipelineStage: 'production',
              createAppIfNotExists: false,
              hasPullRequest: false,
            },
            {
              commitSHA,
              mainAppName: 'runn-prod-euronext-app',
              mainAppUrl: 'https://runn-prod-euronext-app.herokuapp.com',
              hasuraAppName: 'runn-prod-euronext-hasura',
              team,
              pipelineName,
              pipelineStage: 'production',
              createAppIfNotExists: false,
              hasPullRequest: false,
            },
          ]
        }
        default: {
          throw new Error(
            `The branch "${github.context.ref}" does not have a deployment target defined.`,
          )
        }
      }
    }
    case 'pull_request': {
      const pullRequestId = github.context.payload.number

      if (pullRequestId == null) {
        throw new Error(`Could not find Pull Request ID in github.context`)
      }

      return [
        {
          commitSHA: github.context.payload.pull_request.head.sha,
          mainAppName: `runn-pr-${pullRequestId}-app`,
          mainAppUrl: `https://runn-pr-${pullRequestId}-app.herokuapp.com`,
          hasuraAppName: `runn-pr-${pullRequestId}-hasura`,
          team,
          pipelineName,
          pipelineStage: 'development',
          createAppIfNotExists: true,
          hasPullRequest: true,
        },
      ]
    }
  }
}

export { Target, getDeploymentTargets }
