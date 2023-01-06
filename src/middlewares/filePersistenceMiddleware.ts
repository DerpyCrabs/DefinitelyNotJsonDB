import type { JsonDBMiddleware } from '..'
import fs from 'fs'

export default function filePersistenceMiddleware<Schema>(filePath: string): JsonDBMiddleware<Schema> {
  const beforeFn: JsonDBMiddleware<Schema>['beforeMigrate'] = ({ stateBefore }) => {
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

  const beforeFnAsync: JsonDBMiddleware<Schema>['beforeMigrateAsync'] = async ({ stateBefore }) => {
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

  const afterFn: JsonDBMiddleware<Schema>['afterMigrate'] = ({ stateAfter }) => {
    fs.writeFileSync(filePath, JSON.stringify(stateAfter), { encoding: 'utf-8' })
    return stateAfter
  }

  const afterFnAsync: JsonDBMiddleware<Schema>['afterMigrateAsync'] = async ({ stateAfter }) => {
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
    getSnapshot: beforeFn,
    getSnapshotAsync: beforeFnAsync,
  }
}
