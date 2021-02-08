import * as github from '@actions/github'

const { GITHUB_REF } = process.env

type Target = {
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

  switch (GITHUB_REF) {
    case 'refs/heads/development':
      return [
        {
          mainAppName: 'runn-app-staging',
          hasuraAppName: 'runn-hasura-staging',
          team,
          pipelineName,
          pipelineStage: 'staging',
          createAppIfNotExists: false,
        },
      ]
    case 'refs/heads/production':
      return [
        {
          mainAppName: 'runn-app-production',
          hasuraAppName: 'runn-hasura-production',
          team,
          pipelineName,
          pipelineStage: 'production',
          createAppIfNotExists: false,
        },
      ]
    default:
      const pullRequestId = github.context.payload.number

      if (pullRequestId == null) {
        throw new Error(`Could not find Pull Request ID in github.context`)
      }

      return [
        {
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

export { Target, getDeploymentTargets }
