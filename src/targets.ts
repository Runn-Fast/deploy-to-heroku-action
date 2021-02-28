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
              mainAppName: 'runn-app-staging',
              mainAppUrl: 'https://runn-app-staging.herokuapp.com',
              hasuraAppName: 'runn-hasura-staging',
              team,
              pipelineName,
              pipelineStage: 'staging',
              createAppIfNotExists: false,
              hasPullRequest: false,
            },
          ]
        }
        case 'refs/heads/test': {
          return [
            {
              commitSHA,
              mainAppName: 'runn-app-test',
              mainAppUrl: 'https://runn-app-test.herokuapp.com',
              hasuraAppName: 'runn-hasura-test',
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
              mainAppName: 'runn-app-production',
              mainAppUrl: 'https://runn-app-production.herokuapp.com',
              hasuraAppName: 'runn-hasura-production',
              team,
              pipelineName,
              pipelineStage: 'production',
              createAppIfNotExists: false,
              hasPullRequest: false,
            },
            {
              commitSHA,
              mainAppName: 'runn-app-euronext',
              mainAppUrl: 'https://runn-app-euronext.herokuapp.com',
              hasuraAppName: 'runn-hasura-euronext',
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
