import * as github from '@actions/github'

type Target = {
  commitSHA: string,
  mainAppName: string,
  hasuraAppName: string,
  team: string,
  pipelineName: string,
  pipelineStage: string,
  createAppIfNotExists: boolean,
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
              hasuraAppName: 'runn-hasura-staging',
              team,
              pipelineName,
              pipelineStage: 'staging',
              createAppIfNotExists: false,
            },
          ]
        }
        case 'refs/heads/test': {
          return [
            {
              commitSHA,
              mainAppName: 'runn-app-test',
              hasuraAppName: 'runn-hasura-test',
              team,
              pipelineName,
              pipelineStage: 'staging',
              createAppIfNotExists: false,
            },
          ]
        }
        case 'refs/heads/production': {
          return [
            {
              commitSHA,
              mainAppName: 'runn-app-production',
              hasuraAppName: 'runn-hasura-production',
              team,
              pipelineName,
              pipelineStage: 'production',
              createAppIfNotExists: false,
            },
            {
              commitSHA,
              mainAppName: 'runn-app-euronext',
              hasuraAppName: 'runn-hasura-euronext',
              team,
              pipelineName,
              pipelineStage: 'production',
              createAppIfNotExists: false,
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
          hasuraAppName: `runn-pr-${pullRequestId}-hasura`,
          team,
          pipelineName,
          pipelineStage: 'development',
          createAppIfNotExists: true,
        },
      ]
    }
  }
}

export { Target, getDeploymentTargets }
