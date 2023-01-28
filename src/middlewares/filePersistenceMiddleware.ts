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

  const afterFnAsync = ({ stateAfter }: any): Promise<any> => {
    asyncWriteQueue.push(stateAfter)

    return new Promise(r => {
      if (!asyncWriterHandle) {
        asyncWriterHandle = setTimeout(() => {
          if (asyncWriteQueue.length !== 0) {
            fs.writeFileSync(filePath, JSON.stringify(asyncWriteQueue[asyncWriteQueue.length - 1]), {
              encoding: 'utf-8',
            })
          }
          asyncWriterHandle = null
          asyncWriteQueue = []
          r(stateAfter)
        }, 0)
      } else {
        setInterval(() => {
          if (!asyncWriterHandle) {
            r(stateAfter)
          }
        }, 0.5)
      }
    })
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
