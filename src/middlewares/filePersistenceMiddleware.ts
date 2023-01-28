import type { JsonDBMiddleware } from '..'
import fs from 'fs'

export default function filePersistenceMiddleware<Schema>(filePath: string): JsonDBMiddleware<Schema> {
  let hasReadDataFromDisk = false
  let asyncWriteQueue: any[] = []
  let asyncWriterHandle: null | NodeJS.Timeout = null

  const beforeFn = ({ stateBefore }: any) => {
    if (hasReadDataFromDisk) {
      return stateBefore
    }
    try {
      const fileContents = fs.readFileSync(filePath, { encoding: 'utf-8' })
      hasReadDataFromDisk = true
      return JSON.parse(fileContents)
    } catch (e: any) {
      if ('code' in e && e.code === 'ENOENT') {
        return stateBefore
      } else {
        throw e
      }
    }
  }

  const beforeFnAsync = async ({ stateBefore }: any) => {
    if (hasReadDataFromDisk) {
      return stateBefore
    }
    try {
      const fileContents = await fs.promises.readFile(filePath, { encoding: 'utf-8' })
      hasReadDataFromDisk = true
      return JSON.parse(fileContents)
    } catch (e: any) {
      if ('code' in e && e.code === 'ENOENT') {
        return stateBefore
      } else {
        throw e
      }
    }
  }

  const afterFn = ({ stateAfter }: any) => {
    fs.writeFileSync(filePath, JSON.stringify(stateAfter), { encoding: 'utf-8' })
    return stateAfter
  }

  const afterFnAsync = async ({ stateAfter }: any) => {
    asyncWriteQueue.push(stateAfter)
    if (!asyncWriterHandle) {
      asyncWriterHandle = setTimeout(async () => {
        if (asyncWriteQueue.length !== 0) {
          await fs.promises.writeFile(filePath, JSON.stringify(asyncWriteQueue[asyncWriteQueue.length - 1]), {
            encoding: 'utf-8',
          })
        }
        asyncWriterHandle = null
        asyncWriteQueue = []
      }, 0)
    }

    return stateAfter
  }

  return {
    beforeTransact: beforeFn,
    beforeTransactAsync: beforeFnAsync,
    afterTransact: afterFn,
    afterTransactAsync: afterFnAsync,
    beforeMigrate: beforeFn,
    afterMigrate: afterFn,
    beforeMigrateAsync: beforeFnAsync,
    afterMigrateAsync: afterFnAsync,
    get: beforeFn,
    getAsync: beforeFnAsync,
    exportState: beforeFn,
    exportStateAsync: beforeFnAsync,
  }
}
