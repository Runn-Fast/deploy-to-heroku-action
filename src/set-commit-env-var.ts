import * as heroku from './heroku'

type SetCommitEnvVarOptions = {
  appName: string,
  commitSHA: string,
}

const setCommitEnvVar = async (
  options: SetCommitEnvVarOptions,
): Promise<void> => {
  const { appName, commitSHA } = options

  const existingEnvVars = await heroku.getAllEnvVars({ appName })
  const varsToUnset = Object.keys(existingEnvVars).filter((key) => {
    return /^COMMIT_\w{40}$/.test(key)
  })

  if (varsToUnset.length > 0) {
    await heroku.unsetEnvVars({ appName, varNames: varsToUnset })
  }

  const key = `COMMIT_${commitSHA}`
  await heroku.setEnvVars({
    appName,
    config: {
      COMMIT_SHA: commitSHA,
      [key]: commitSHA,
    },
  })
}

export { setCommitEnvVar }
