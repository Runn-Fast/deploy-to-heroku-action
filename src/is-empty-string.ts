const isEmptyString = (value: string): boolean => {
  if (typeof value !== 'string') {
    return true
  }
  return value.trim().length === 0
}

export { isEmptyString }
