import anyTest, { TestInterface } from 'ava'
import * as stu from 'stu'
import { SinonStub } from 'sinon'

import * as Heroku from './heroku'

const test = anyTest as TestInterface<{
  heroku: typeof Heroku
  exec: SinonStub
  execAndReadAll: SinonStub
}>

test.beforeEach((t) => {
  // Disable calls to exec library
  const { exec, execAndReadAll } = stu.mock('./exec') as {
    exec: SinonStub
    execAndReadAll: SinonStub
  }
  exec.resolves()
  execAndReadAll.resolves('')

  const heroku = stu.test('./heroku') as typeof Heroku

  t.context = {
    heroku,
    exec,
    execAndReadAll,
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

test('bootDynos: if not running, should boot', async (t) => {
  const { heroku, exec, execAndReadAll } = t.context

  execAndReadAll.onCall(0).resolves('[]')

  await heroku.bootDynos({
    appName: 'test-app',
    dynoTypes: ['web', 'worker'],
    restartIfAlreadyRunning: false,
  })

  t.is(1, exec.callCount)
  t.deepEqual(
    ['heroku', ['ps:scale', 'web=1', 'worker=1', '--app', 'test-app']],
    exec.args[0],
  )
})

test('bootDynos(restartIfAlreadyRunning=false): if partially running, should only boot', async (t) => {
  const { heroku, exec, execAndReadAll } = t.context

  execAndReadAll.onCall(0).resolves('[{ "type": "web" }]')

  await heroku.bootDynos({
    appName: 'test-app',
    dynoTypes: ['web', 'worker'],
    restartIfAlreadyRunning: false,
  })

  t.is(1, exec.callCount)
  t.deepEqual(
    ['heroku', ['ps:scale', 'worker=1', '--app', 'test-app']],
    exec.args[0],
  )
})

test('bootDynos(restartIfAlreadyRunning=true): if partially running, should boot & restart', async (t) => {
  const { heroku, exec, execAndReadAll } = t.context

  execAndReadAll.onCall(0).resolves('[{ "type": "web" }]')

  await heroku.bootDynos({
    appName: 'test-app',
    dynoTypes: ['web', 'worker'],
    restartIfAlreadyRunning: true,
  })

  t.is(2, exec.callCount)
  t.deepEqual(
    ['heroku', ['ps:scale', 'worker=1', '--app', 'test-app']],
    exec.args[0],
  )
  t.deepEqual(
    ['heroku', ['ps:restart', 'web', '--app', 'test-app']],
    exec.args[1],
  )
})

test('bootDynos(restartIfAlreadyRunning=false): if running, should do nothing', async (t) => {
  const { heroku, exec, execAndReadAll } = t.context

  execAndReadAll.onCall(0).resolves('[{ "type": "worker" },{ "type": "web" }]')

  await heroku.bootDynos({
    appName: 'test-app',
    dynoTypes: ['web', 'worker'],
    restartIfAlreadyRunning: false,
  })

  t.is(0, exec.callCount)
})

test('bootDynos(restartIfAlreadyRunning=true): if running, should restart', async (t) => {
  const { heroku, exec, execAndReadAll } = t.context

  execAndReadAll.onCall(0).resolves('[{ "type": "worker" },{ "type": "web" }]')

  await heroku.bootDynos({
    appName: 'test-app',
    dynoTypes: ['web', 'worker'],
    restartIfAlreadyRunning: true,
  })

  t.is(2, exec.callCount)
  t.deepEqual(
    ['heroku', ['ps:restart', 'web', '--app', 'test-app']],
    exec.args[0],
  )
  t.deepEqual(
    ['heroku', ['ps:restart', 'worker', '--app', 'test-app']],
    exec.args[1],
  )
})
