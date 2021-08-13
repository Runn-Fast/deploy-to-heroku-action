const isReviewAppName = (appName: string): boolean =>
  /^runn-pr-\d+-(app|hasura)$/.test(appName)

export { isReviewAppName }
