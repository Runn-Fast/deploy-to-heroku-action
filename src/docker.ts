import { exec } from './exec'

type TagOptions = {
  sourceImage: string,
  targetImage: string,
}

const tag = async (options: TagOptions): Promise<void> => {
  const { sourceImage, targetImage } = options
  await exec('docker', ['tag', sourceImage, targetImage])
}

type PushOptions = {
  image: string,
}

const push = async (options: PushOptions): Promise<void> => {
  const { image } = options
  await exec('docker', ['push', image])
}

export { tag, push }
