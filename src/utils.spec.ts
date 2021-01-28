import test from 'ava'

import { isEmptyString } from './utils'

test('should return true when input is empty', (t) => {
  t.true(isEmptyString(null))
  t.true(isEmptyString(undefined))
  t.true(isEmptyString(''))
  t.true(isEmptyString(' '))
  t.true(isEmptyString('  '))
})

test('should return false when input is not empty', (t) => {
  t.false(isEmptyString('a'))
  t.false(isEmptyString('0'))
  t.false(isEmptyString('false'))
  t.false(isEmptyString('empty'))
})

