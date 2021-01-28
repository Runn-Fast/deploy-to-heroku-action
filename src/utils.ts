const isEmptyString = (value: string): boolean => {
  if (value == null) {
    return true
  }
  if (typeof value === 'string') {
    return value.trim().length === 0
  }
}

export { isEmptyString }
