import { JsonDBMiddleware } from '..'
import { getObjectDiff } from '@donedeal0/superdiff'

type LoggingMiddlewareOptions<Schema> = {
  logMigrate: boolean
  logTransact: boolean
  logGetSnapshot: boolean
  logOutputFn: (data: {
    hook: keyof JsonDBMiddleware<Schema>
    paths?: { [key: string]: string }
    stateBefore: Schema
    stateAfter?: Schema
    migrationId?: number
    migrationTitle?: string
    message: string
    diff?: ReturnType<typeof getObjectDiff>
  }) => void
  logBeforeAction: boolean
}

export default function loggingMiddleware<Schema>({
  logMigrate = true,
  logTransact = true,
  logGetSnapshot = true,
  logOutputFn,
  logBeforeAction = false,
}: LoggingMiddlewareOptions<Schema>): JsonDBMiddleware<Schema> {
  const middleware: Required<JsonDBMiddleware<Schema>> = {
    getSnapshot: ({ stateBefore }) => {
      logOutputFn({ stateBefore, message: 'getSnapshot was called', hook: 'getSnapshot' })
      return stateBefore
    },
    getSnapshotAsync: async ({ stateBefore }) => {
      logOutputFn({ stateBefore, message: 'getSnapshotAsync was called', hook: 'getSnapshotAsync' })
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
        message: `afterMigrate: ${migrationId} - ${migrationTitle}`,
        hook: 'afterMigrate',
        diff: getObjectDiff(stateBefore, stateAfter),
      })
      return stateBefore
    },
    afterMigrateAsync: async ({ stateBefore, stateAfter, migrationId, migrationTitle }) => {
      logOutputFn({
        stateBefore,
        stateAfter,
        migrationId,
        migrationTitle,
        message: `afterMigrateAsync: ${migrationId} - ${migrationTitle}`,
        hook: 'afterMigrateAsync',
        diff: getObjectDiff(stateBefore, stateAfter),
      })
      return stateBefore
    },
    afterTransact: ({ stateBefore, stateAfter, paths }) => {
      logOutputFn({
        stateBefore,
        stateAfter,
        paths,
        message: `afterTransact: ${JSON.stringify(paths)}`,
        hook: 'afterTransact',
        diff: getObjectDiff(stateBefore, stateAfter),
      })
      return stateBefore
    },
    afterTransactAsync: async ({ stateBefore, stateAfter, paths }) => {
      logOutputFn({
        stateBefore,
        stateAfter,
        paths,
        message: `afterTransactAsync: ${JSON.stringify(paths)}`,
        hook: 'afterTransactAsync',
        diff: getObjectDiff(stateBefore, stateAfter),
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
    ...(logGetSnapshot ? { getSnapshot: middleware.getSnapshot, getSnapshotAsync: middleware.getSnapshotAsync } : {}),
  }
}
