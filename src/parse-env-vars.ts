const parseEnvVars = (input: string): Record<string, string> => {
  const lines = input.split('\n')
  return lines
    .map((line) => line.trim())
    .filter((line) => {
      return line.length > 0
    })
    .map((line, index) => {
      const match = /(\w+)=(.*)/.exec(line)
      if (match == null) {
        throw new Error(
          `Invalid env-var config, could not parse line ${index}: "${line}"`,
        )
      }
      const key = match[1]
      const value = match[2]
      return [key, value]
    })
    .reduce<Record<string, string>>((obj, [key, value]) => {
    obj[key] = value
    return obj
  }, {})
}

export { parseEnvVars }
