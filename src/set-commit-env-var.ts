import * as heroku from './heroku'

type SetCommitEnvVarOptions = {
  appName: string
  commitSHA: string
}

const setCommitEnvVar = async (
  options: SetCommitEnvVarOptions,
): Promise<void> => {
  const { appName, commitSHA } = options

  const commitSHAKey = `COMMIT_${commitSHA}`

  const existingEnvVars = await heroku.getAllEnvVars({ appName })
  const varsToUnset = Object.keys(existingEnvVars).filter((key) => {
    if (key === commitSHAKey) {
      return false
    }

    return /^COMMIT_\w{40}$/.test(key)
  })

  if (varsToUnset.length > 0) {
    await heroku.unsetEnvVars({ appName, varNames: varsToUnset })
  }

  await heroku.setEnvVars({
    appName,
    config: {
      COMMIT_SHA: commitSHA,
      [commitSHAKey]: commitSHA,
    },
  })
}

export { setCommitEnvVar }
