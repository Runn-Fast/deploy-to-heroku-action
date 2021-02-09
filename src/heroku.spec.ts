import anyTest, { TestInterface } from 'ava'
import * as stu from 'stu'
import { SinonStub } from 'sinon'

import * as Heroku from './heroku'

const test = anyTest as TestInterface<{
  heroku: typeof Heroku,
  exec: SinonStub,
}>

test.beforeEach((t) => {
  // disable calls to exec library
  const { exec } = stu.mock('./exec')
  exec.resolves()

  const heroku = stu.test('./heroku')

  t.context = {
    heroku,
    exec,
  }
})

test('destroyApp: should destroy a development app', async (t) => {
  const { heroku, exec } = t.context

  await heroku.destroyApp({
    appName: 'runn-pr-1-app',
  })

  t.is(exec.callCount, 1)
  t.deepEqual(exec.args[0], [
    'heroku',
    ['apps:destroy', '--app', 'runn-pr-1-app', '--confirm', 'runn-pr-1-app'],
  ])
})

test('destroyApp: should not allow production to be destroyed', async (t) => {
  const { heroku } = t.context

  await t.throwsAsync(
    heroku.destroyApp({
      appName: 'production',
    }),
    {
      message:
        'We should only be destroying temporary development apps, not "production"!',
    },
  )
})
