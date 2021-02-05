import * as crypto from 'crypto'

const randomHex = (length: number): string => {
  return crypto.randomFillSync(Buffer.alloc(length)).toString('hex')
}

export { randomHex }
