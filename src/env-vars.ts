type EnvVars = Record<string, string>

const parseEnvVars = (input: string): EnvVars => {
  const lines = input.split('\n')
  return Object.fromEntries(
    lines
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map<[string, string]>((line, index) => {
        const match = /(\w+)=(.*)/.exec(line)
        if (!match || !match[1] || !match[2]) {
          throw new Error(
            `Invalid env-var config, could not parse line ${index}: "${line}"`,
          )
        }

        const key = match[1]
        const value = match[2]
        return [key, value]
      }),
  )
}

export { EnvVars, parseEnvVars }
