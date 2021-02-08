import test from 'ava'

import { parseEnvVars } from './env-vars'

test('should parse valid env var config', (t) => {
  const envVars = parseEnvVars(`
    KEY_ONE=value-one
    KEY_TWO=value-two
    KEY_THREE=value-three
  `)

  t.deepEqual(envVars, {
    KEY_ONE: 'value-one',
    KEY_TWO: 'value-two',
    KEY_THREE: 'value-three',
  })
})
