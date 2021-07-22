const isReviewAppName = (appName: string): boolean => {
  return /^runn-pr-\d+-(app|hasura)$/.test(appName)
}

export { isReviewAppName }
