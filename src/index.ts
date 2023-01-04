import filePersistenceMiddleware from './middlewares/filePersistenceMiddleware'
import superjsonMiddleware from './middlewares/superjsonMiddleware'
import { A, O, B, S } from 'ts-toolbelt'
import produce from 'immer'
import superjson from 'superjson'

export type AsyncJsonDBMiddleware<Schema> = {
  beforeTransactAsync?: ({ paths, stateBefore }: { paths: Paths; stateBefore: Schema }) => Promise<Schema>
  afterTransactAsync?: ({
    paths,
    stateBefore,
    stateAfter,
  }: {
    paths: Paths
    stateBefore: Schema
    stateAfter: Schema
  }) => Promise<Schema>
  beforeMigrateAsync?: ({ stateBefore }: { stateBefore: any }) => Promise<any>
  afterMigrateAsync?: ({ stateBefore, stateAfter }: { stateBefore: any; stateAfter: any }) => Promise<any>
  getSnapshotAsync?: ({ stateBefore }: { stateBefore: Schema }) => Promise<Schema>
}

export type JsonDBMiddleware<Schema> = {
  beforeTransact?: ({ paths, stateBefore }: { paths: Paths; stateBefore: Schema }) => Schema
  afterTransact?: ({
    paths,
    stateBefore,
    stateAfter,
  }: {
    paths: Paths
    stateBefore: Schema
    stateAfter: Schema
  }) => Schema
  beforeMigrate?: ({ stateBefore }: { stateBefore: any }) => any
  afterMigrate?: ({ stateBefore, stateAfter }: { stateBefore: any; stateAfter: any }) => any
  getSnapshot?: ({ stateBefore }: { stateBefore: Schema }) => Schema
} & AsyncJsonDBMiddleware<Schema>

export class JsonDB<
  Schema extends object,
  IsAsyncOnly extends boolean = false,
  Middleware = IsAsyncOnly extends true ? AsyncJsonDBMiddleware<Schema> : JsonDBMiddleware<Schema>
> {
  private currentState: Schema
  private middleware: Required<JsonDBMiddleware<Schema>>
  private currentMigrationId: number | undefined
  private isAsyncOnly: boolean

  constructor(
    initialState: Schema,
    options?: { middleware?: Middleware | Middleware[]; isAsyncOnly?: IsAsyncOnly },
    currentMigrationId?: number
  ) {
    this.currentState = initialState
    this.currentMigrationId = currentMigrationId
    this.isAsyncOnly = options?.isAsyncOnly || false
    this.middleware = this.composeMiddlewares(
      options?.middleware as JsonDBMiddleware<Schema> | JsonDBMiddleware<Schema>[] | undefined
    )
  }

  private composeMiddlewares(
    middleware?: JsonDBMiddleware<Schema> | JsonDBMiddleware<Schema>[]
  ): Required<JsonDBMiddleware<Schema>> {
    const noopMiddleware: Required<JsonDBMiddleware<Schema>> = {
      beforeTransact: ({ stateBefore }) => stateBefore,
      afterTransact: ({ stateAfter }) => stateAfter,
      beforeTransactAsync: async ({ stateBefore }) => stateBefore,
      afterTransactAsync: async ({ stateAfter }) => stateAfter,
      beforeMigrate: ({ stateBefore }) => stateBefore,
      afterMigrate: ({ stateAfter }) => stateAfter,
      beforeMigrateAsync: async ({ stateBefore }) => stateBefore,
      afterMigrateAsync: async ({ stateAfter }) => stateAfter,
      getSnapshot: ({ stateBefore }) => stateBefore,
      getSnapshotAsync: async ({ stateBefore }) => stateBefore,
    }

    const middlewares: Required<JsonDBMiddleware<Schema>>[] = middleware
      ? Array.isArray(middleware)
        ? middleware.map(m => ({ ...noopMiddleware, ...m }))
        : [{ ...noopMiddleware, ...middleware }]
      : [noopMiddleware]

    return {
      beforeTransact: ({ paths, stateBefore }) => {
        let state = stateBefore
        for (const fn of middlewares.map(m => m.beforeTransact)) {
          state = fn({ paths, stateBefore: state })
        }
        return state
      },
      afterTransact: ({ paths, stateBefore, stateAfter }) => {
        let state = stateAfter
        for (const fn of middlewares.map(m => m.afterTransact).reverse()) {
          state = fn({ paths, stateBefore, stateAfter: state })
        }
        return state
      },
      beforeTransactAsync: async ({ paths, stateBefore }) => {
        let state = stateBefore
        for (const fn of middlewares.map(m => m.beforeTransactAsync)) {
          state = await fn({ paths, stateBefore: state })
        }
        return state
      },
      afterTransactAsync: async ({ paths, stateBefore, stateAfter }) => {
        let state = stateAfter
        for (const fn of middlewares.map(m => m.afterTransactAsync).reverse()) {
          state = await fn({ paths, stateBefore, stateAfter: state })
        }
        return state
      },
      beforeMigrate: ({ stateBefore }) => {
        let state = stateBefore
        for (const fn of middlewares.map(m => m.beforeMigrate)) {
          state = fn({ stateBefore: state })
        }
        return state
      },
      afterMigrate: ({ stateBefore, stateAfter }) => {
        let state = stateAfter
        for (const fn of middlewares.map(m => m.afterMigrate).reverse()) {
          state = fn({ stateBefore, stateAfter: state })
        }
        return state
      },
      beforeMigrateAsync: async ({ stateBefore }) => {
        let state = stateBefore
        for (const fn of middlewares.map(m => m.beforeMigrateAsync)) {
          state = await fn({ stateBefore: state })
        }
        return state
      },
      afterMigrateAsync: async ({ stateBefore, stateAfter }) => {
        let state = stateAfter
        for (const fn of middlewares.map(m => m.afterMigrateAsync).reverse()) {
          state = await fn({ stateBefore, stateAfter: state })
        }
        return state
      },
      getSnapshot: ({ stateBefore }) => {
        let state = stateBefore
        for (const fn of middlewares.map(m => m.getSnapshot)) {
          state = fn({ stateBefore: state })
        }
        return state
      },
      getSnapshotAsync: async ({ stateBefore }) => {
        let state = stateBefore
        for (const fn of middlewares.map(m => m.getSnapshotAsync)) {
          state = await fn({ stateBefore: state })
        }
        return state
      },
    }
  }

  public getSnapshot: IsAsyncOnly extends true ? never : () => Schema = (() => {
    if (this.isAsyncOnly) throw new Error('getSnapshot is not available with isAsyncOnly = true')
    return this.middleware.getSnapshot({ stateBefore: this.currentState })
  }) as any

  public getSnapshotAsync(): Promise<Schema> {
    return this.middleware.getSnapshotAsync({ stateBefore: this.currentState })
  }

  public migrate: IsAsyncOnly extends true
    ? never
    : <Output extends object>(
        title: string,
        apply: (i: Schema) => Output
      ) => JsonDB<Output & { __migrationHistory: { id: number; createdAt: string; title: string }[] }> = ((
    title: string,
    apply: (i: any) => any
  ) => {
    if (this.isAsyncOnly) throw new Error('migrate is not available with isAsyncOnly = true')

    this.currentMigrationId = this.currentMigrationId ? this.currentMigrationId + 1 : 1

    let state = cloneState(this.currentState) as Schema & {
      __migrationHistory: { id: number; createdAt: string; title: string }[]
    }
    state = this.middleware.beforeMigrate({ stateBefore: state })

    let lastMigrationId = state.__migrationHistory
      ? Math.max(0, ...state.__migrationHistory.map((r: { id: number }) => r.id))
      : 0
    if (lastMigrationId >= (this.currentMigrationId || 0)) {
      console.debug(`Skipped migration ${this.currentMigrationId} - '${title}'`)
      return this as any
    }
    try {
      let migratedState = {
        ...apply(state),
        __migrationHistory: [
          ...(state.__migrationHistory || []),
          {
            id: this.currentMigrationId,
            title: title,
            appliedAt: new Date(),
          },
        ],
      }

      migratedState = this.middleware.afterMigrate({ stateBefore: state, stateAfter: migratedState })
      this.currentState = migratedState as any
    } catch (e) {
      console.error(`Error while applying migration ${this.currentMigrationId} - '${title}'`)
      throw e
    }
    console.debug(`Applied migration ${this.currentMigrationId} - '${title}'`)

    return this as any
  }) as any

  public async migrateAsync<Output extends object>(
    title: string,
    apply: (i: Schema) => Promise<Output>
  ): Promise<JsonDB<Output & { __migrationHistory: { id: number; createdAt: string; title: string }[] }>> {
    this.currentMigrationId = this.currentMigrationId ? this.currentMigrationId + 1 : 1

    let state = cloneState(this.currentState) as Schema & {
      __migrationHistory: { id: number; createdAt: string; title: string }[]
    }
    state = await this.middleware.beforeMigrateAsync({ stateBefore: state })

    let lastMigrationId = state.__migrationHistory
      ? Math.max(0, ...state.__migrationHistory.map((r: { id: number }) => r.id))
      : 0
    if (lastMigrationId >= (this.currentMigrationId || 0)) {
      console.debug(`Skipped migration ${this.currentMigrationId} - '${title}'`)
      return this as any
    }
    try {
      let migratedState = {
        ...(await apply(state)),
        __migrationHistory: [
          ...(state.__migrationHistory || []),
          {
            id: this.currentMigrationId,
            title: title,
            appliedAt: new Date(),
          },
        ],
      }

      migratedState = await this.middleware.afterMigrateAsync({ stateBefore: state, stateAfter: migratedState })
      this.currentState = migratedState as any
    } catch (e) {
      console.error(`Error while applying migration ${this.currentMigrationId} - '${title}'`)
      throw e
    }
    console.debug(`Applied migration ${this.currentMigrationId} - '${title}'`)

    return this as any
  }

  public transact: IsAsyncOnly extends true
    ? never
    : <K extends Paths>(paths: {
        [key in keyof K]: B.Or<
          A.Equals<O.Path<Schema, S.Split<K[key], '.'>>, never>,
          A.Equals<O.Path<Schema, S.Split<K[key], '.'>>, undefined>
        > extends 1
          ? never
          : K[key]
      }) => <Result>(
        f: (state: {
          [key in keyof K]: O.Path<Schema, S.Split<K[key], '.'>>
        }) => Result
      ) => Result = ((paths: any) => {
    if (this.isAsyncOnly) throw new Error('transact is not available with isAsyncOnly = true')

    return (action: any) => {
      for (;;) {
        const initialState = this.currentState

        const [state, result] = this.performTransaction(initialState, paths, action)

        if (initialState !== this.currentState) {
          continue
        }
        this.currentState = state
        return result
      }
    }
  }) as any

  public transactAsync: <K extends Paths>(paths: {
    [key in keyof K]: B.Or<
      A.Equals<O.Path<Schema, S.Split<K[key], '.'>>, never>,
      A.Equals<O.Path<Schema, S.Split<K[key], '.'>>, undefined>
    > extends 1
      ? never
      : K[key]
  }) => <Result>(
    f: (state: {
      [key in keyof K]: O.Path<Schema, S.Split<K[key], '.'>>
    }) => Promise<Result>
  ) => Promise<Result> = paths => {
    return async action => {
      for (;;) {
        const initialState = this.currentState

        const [state, result] = await this.performAsyncTransaction(initialState, paths, action)

        if (initialState !== this.currentState) {
          continue
        }
        this.currentState = state
        return result
      }
    }
  }

  private performTransaction<Result>(initialState: any, paths: Paths, action: (state: any) => Result): [any, Result] {
    let state = this.middleware.beforeTransact({ paths, stateBefore: cloneState(initialState) })

    const actionState = actionStateFromPaths(state, paths)

    let result = undefined
    const newActionState = produce(actionState, (s: any) => {
      result = action(s)
    })

    setStateFromActionState(paths, newActionState, state)

    state = this.middleware.afterTransact({ paths, stateBefore: this.currentState, stateAfter: state })

    return [state, result as unknown as Result]
  }

  private async performAsyncTransaction<Result>(
    initialState: any,
    paths: Paths,
    action: (state: any) => Promise<Result>
  ): Promise<[any, Result]> {
    let state = await this.middleware.beforeTransactAsync({ paths, stateBefore: cloneState(initialState) })

    const actionState = actionStateFromPaths(state, paths)

    let result = undefined
    const newActionState = await produce(actionState, async (s: any) => {
      result = await action(s)
    })

    setStateFromActionState(paths, newActionState, state)

    state = await this.middleware.afterTransactAsync({ paths, stateBefore: this.currentState, stateAfter: state })

    return [state, result as unknown as Result]
  }
}

type Paths = { [key: string]: string }

function getViewFromPath(state: any, path: (string | number)[]): any {
  let fieldPointer = state
  path.forEach(field => {
    fieldPointer = fieldPointer[field]
  })
  return fieldPointer
}

function actionStateFromPaths(state: any, paths: Paths): any {
  return Object.fromEntries(
    Object.entries(paths).map(([fieldName, path]) => [fieldName, getViewFromPath(state, splitPath(path))])
  )
}

function setStateFromActionState(paths: Paths, actionState: { [key: string]: any }, currentState: any) {
  Object.entries(paths).forEach(([fieldName, path]) => {
    let fieldPointer = currentState
    const pathFields = splitPath(path)
    pathFields.slice(0, pathFields.length - 1).forEach(field => {
      fieldPointer = fieldPointer[field]
    })
    fieldPointer[pathFields[pathFields.length - 1]] = actionState[fieldName]
  })
}

function splitPath(path: string): (number | string)[] {
  return path.split('.').map(p => (/^\d+$/.test(p) ? Number.parseInt(p, 10) : p))
}

function cloneState<Schema>(state: Schema): Schema {
  return superjson.parse(superjson.stringify(state))
}

export default JsonDB
export { filePersistenceMiddleware, superjsonMiddleware }
