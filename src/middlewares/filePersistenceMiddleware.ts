import type { JsonDBMiddleware } from '..'
import fs from 'fs'

export default function filePersistenceMiddleware<Schema>(filePath: string): JsonDBMiddleware<Schema> {
  return {
    beforeTransact: ({ stateBefore }) => {
      if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, { encoding: 'utf-8' }))
      } else {
        return stateBefore
      }
    },
    beforeTransactAsync: async ({ stateBefore }) => {
      if (fs.existsSync(filePath)) {
        return JSON.parse(fs.readFileSync(filePath, { encoding: 'utf-8' }))
      } else {
        return stateBefore
      }
    },
    afterTransact: ({ stateAfter }) => {
      fs.writeFileSync(filePath, JSON.stringify(stateAfter), { encoding: 'utf-8' })
      return stateAfter
    },
    afterTransactAsync: async ({ stateAfter }) => {
      fs.writeFileSync(filePath, JSON.stringify(stateAfter), { encoding: 'utf-8' })
      return stateAfter
    },
  }
}
