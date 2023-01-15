import { JsonDBMiddleware } from '..'
import { diffString } from 'json-diff'

type LogOutputFnData<Schema> = {
  stateBefore: Schema
  message: string
} & (
  | {
      hook: 'beforeTransact' | 'beforeTransactAsync'
      paths: { [key: string]: string }
    }
  | {
      hook: 'get' | 'getAsync'
      paths: { [key: string]: string }
    }
  | {
      hook: 'afterTransact' | 'afterTransactAsync'
      paths: { [key: string]: string }
      stateAfter: Schema
    }
  | {
      hook: 'beforeMigrate' | 'beforeMigrateAsync'
      migrationId: number
      migrationTitle: string
    }
  | {
      hook: 'afterMigrate' | 'afterMigrateAsync'
      migrationId: number
      migrationTitle: string
      stateAfter: Schema
    }
  | {
      hook: 'exportState' | 'exportStateAsync'
    }
)

type LoggingMiddlewareOptions<Schema> = {
  logMigrate?: boolean
  logTransact?: boolean
  logGet?: boolean
  logExportState?: boolean
  logOutputFn: (data: LogOutputFnData<Schema>) => void
  logBeforeAction?: boolean
  diff?: boolean
  diffColor?: boolean
}

export default function loggingMiddleware<Schema>({
  logMigrate = true,
  logTransact = true,
  logGet = true,
  logExportState = true,
  logOutputFn,
  logBeforeAction = false,
  diff = true,
  diffColor = true,
}: LoggingMiddlewareOptions<Schema>): JsonDBMiddleware<Schema> {
  const printDiff = (stateBefore: any, stateAfter: any): string => {
    if (diff) {
      return `\n${diffString(stateBefore, stateAfter, { color: diffColor })}`
    } else {
      return ''
    }
  }
  const middleware: Required<JsonDBMiddleware<Schema>> = {
    exportState: ({ stateBefore }) => {
      logOutputFn({ stateBefore, message: 'exportState was called', hook: 'exportState' })
      return stateBefore
    },
    exportStateAsync: async ({ stateBefore }) => {
      logOutputFn({ stateBefore, message: 'exportStateAsync was called', hook: 'exportStateAsync' })
      return stateBefore
    },
    beforeMigrate: ({ stateBefore, migrationId, migrationTitle }) => {
      logOutputFn({
        stateBefore,
        migrationId,
        migrationTitle,
        message: `beforeMigrate: ${migrationId} - ${migrationTitle}`,
        hook: 'beforeMigrate',
      })
      return stateBefore
    },
    beforeMigrateAsync: async ({ stateBefore, migrationId, migrationTitle }) => {
      logOutputFn({
        stateBefore,
        migrationId,
        migrationTitle,
        message: `beforeMigrateAsync: ${migrationId} - ${migrationTitle}`,
        hook: 'beforeMigrateAsync',
      })
      return stateBefore
    },
    get: ({ stateBefore, paths }) => {
      logOutputFn({
        stateBefore,
        paths,
        message: `get: ${JSON.stringify(paths)}`,
        hook: 'get',
      })
      return stateBefore
    },
    getAsync: async ({ stateBefore, paths }) => {
      logOutputFn({
        stateBefore,
        paths,
        message: `getAsync: ${JSON.stringify(paths)}`,
        hook: 'getAsync',
      })
      return stateBefore
    },
    beforeTransact: ({ stateBefore, paths }) => {
      logOutputFn({
        stateBefore,
        paths,
        message: `beforeTransact: ${JSON.stringify(paths)}`,
        hook: 'beforeTransact',
      })
      return stateBefore
    },
    beforeTransactAsync: async ({ stateBefore, paths }) => {
      logOutputFn({
        stateBefore,
        paths,
        message: `beforeTransactAsync: ${JSON.stringify(paths)}`,
        hook: 'beforeTransactAsync',
      })
      return stateBefore
    },
    afterMigrate: ({ stateBefore, stateAfter, migrationId, migrationTitle }) => {
      logOutputFn({
        stateBefore,
        stateAfter,
        migrationId,
        migrationTitle,
        message: `afterMigrate: ${migrationId} - ${migrationTitle}${printDiff(stateBefore, stateAfter)}`,
        hook: 'afterMigrate',
      })
      return stateBefore
    },
    afterMigrateAsync: async ({ stateBefore, stateAfter, migrationId, migrationTitle }) => {
      logOutputFn({
        stateBefore,
        stateAfter,
        migrationId,
        migrationTitle,
        message: `afterMigrateAsync: ${migrationId} - ${migrationTitle}${printDiff(stateBefore, stateAfter)}`,
        hook: 'afterMigrateAsync',
      })
      return stateBefore
    },
    afterTransact: ({ stateBefore, stateAfter, paths }) => {
      logOutputFn({
        stateBefore,
        stateAfter,
        paths,
        message: `afterTransact: ${JSON.stringify(paths)}${printDiff(stateBefore, stateAfter)}`,
        hook: 'afterTransact',
      })
      return stateBefore
    },
    afterTransactAsync: async ({ stateBefore, stateAfter, paths }) => {
      logOutputFn({
        stateBefore,
        stateAfter,
        paths,
        message: `afterTransactAsync: ${JSON.stringify(paths)}${printDiff(stateBefore, stateAfter)}`,
        hook: 'afterTransactAsync',
      })
      return stateBefore
    },
  }

  return {
    ...(logBeforeAction
      ? {
          ...(logMigrate
            ? { beforeMigrate: middleware.beforeMigrate, beforeMigrateAsync: middleware.beforeMigrateAsync }
            : {}),
          ...(logTransact
            ? {
                beforeTransact: middleware.beforeTransact,
                beforeTransactAsync: middleware.beforeTransactAsync,
              }
            : {}),
        }
      : {}),
    ...(logMigrate ? { afterMigrate: middleware.afterMigrate, afterMigrateAsync: middleware.afterMigrateAsync } : {}),
    ...(logTransact
      ? { afterTransact: middleware.afterTransact, afterTransactAsync: middleware.afterTransactAsync }
      : {}),
    ...(logExportState ? { exportState: middleware.exportState, exportStateAsync: middleware.exportStateAsync } : {}),
    ...(logGet ? { get: middleware.get, getAsync: middleware.getAsync } : {}),
  }
}
