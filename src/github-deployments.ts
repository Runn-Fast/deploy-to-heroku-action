import * as github from '@actions/github'

type CreateGithubDeploymentOptions = {
  githubAPIKey: string,
  ref: string, // ref can be a branch, tag or SHA
}

const createGithubDeployment = async (
  options: CreateGithubDeploymentOptions,
): Promise<number> => {
  const { githubAPIKey, ref } = options

  const octokit = github.getOctokit(githubAPIKey)

  const result = await octokit.request(
    'POST /repos/{owner}/{repo}/deployments',
    {
      owner: 'Runn-Fast',
      repo: 'runn',
      ref,
      task: 'deploy',
      auto_merge: false,
      required_contexts: [],
      environment: 'Heroku',
    },
  )

  const data = result.data as { id: number }
  const deploymentId = data.id
  return deploymentId
}

enum GithubDeploymentState {
  ERROR = 'error',
  FAILURE = 'failure',
  INACTIVE = 'inactive',
  IN_PROGRESS = 'in_progress',
  QUEUED = 'queued',
  PENDING = 'pending',
  SUCCESS = 'success',
}

type SetGithubDeploymentStatusOptions = {
  githubAPIKey: string,
  ref: string,
  deploymentId: number,
  state: GithubDeploymentState,
  environmentUrl: string,
}

const setGithubDeploymentStatus = async (
  options: SetGithubDeploymentStatusOptions,
): Promise<void> => {
  const { githubAPIKey, ref, deploymentId, state, environmentUrl } = options

  const octokit = github.getOctokit(githubAPIKey)

  await octokit.request(
    'POST /repos/{owner}/{repo}/deployments/{deployment_id}/statuses',
    {
      owner: 'Runn-Fast',
      repo: 'runn',
      ref,
      deployment_id: deploymentId,
      state,
      environment_url: environmentUrl,
    },
  )
}

export {
  createGithubDeployment,
  setGithubDeploymentStatus,
  GithubDeploymentState,
}
