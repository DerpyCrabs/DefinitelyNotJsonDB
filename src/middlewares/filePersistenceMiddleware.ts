import type { JsonDBMiddleware } from '..'
import fs from 'fs'

export default function filePersistenceMiddleware<Schema>(filePath: string): JsonDBMiddleware<Schema> {
  const beforeFn = ({ stateBefore }: any) => {
    try {
      const fileContents = fs.readFileSync(filePath, { encoding: 'utf-8' })
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
    try {
      const fileContents = await fs.promises.readFile(filePath, { encoding: 'utf-8' })
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
    await fs.promises.writeFile(filePath, JSON.stringify(stateAfter), { encoding: 'utf-8' })
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
    getSnapshot: beforeFn,
    getSnapshotAsync: beforeFnAsync,
  }
}
