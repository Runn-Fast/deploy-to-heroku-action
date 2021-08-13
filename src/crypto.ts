import { Buffer } from 'buffer'
import * as crypto from 'crypto'

const randomHex = (length: number): string =>
  crypto.randomFillSync(Buffer.alloc(length)).toString('hex')

export { randomHex }
