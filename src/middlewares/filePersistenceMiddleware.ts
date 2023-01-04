import type { JsonDBMiddleware } from '..'
import fs from 'fs'

export default function filePersistenceMiddleware<Schema>(filePath: string): JsonDBMiddleware<Schema> {
  const beforeFn: JsonDBMiddleware<Schema>['beforeMigrate'] = ({ stateBefore }) => {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, { encoding: 'utf-8' }))
    } else {
      return stateBefore
    }
  }

  const beforeFnAsync: JsonDBMiddleware<Schema>['beforeMigrateAsync'] = async ({ stateBefore }) => {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, { encoding: 'utf-8' }))
    } else {
      return stateBefore
    }
  }

  const afterFn: JsonDBMiddleware<Schema>['afterMigrate'] = ({ stateAfter }) => {
    fs.writeFileSync(filePath, JSON.stringify(stateAfter), { encoding: 'utf-8' })
    return stateAfter
  }

  const afterFnAsync: JsonDBMiddleware<Schema>['afterMigrateAsync'] = async ({ stateAfter }) => {
    fs.writeFileSync(filePath, JSON.stringify(stateAfter), { encoding: 'utf-8' })
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
