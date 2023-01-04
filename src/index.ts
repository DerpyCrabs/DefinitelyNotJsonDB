import { A, O, B, S } from 'ts-toolbelt'
import produce from 'immer'
import superjson from 'superjson'
import filePersistenceMiddleware from './middlewares/filePersistenceMiddleware'
import superjsonMiddleware from './middlewares/superjsonMiddleware'

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
  beforeMigrate?: ({ stateBefore }: { stateBefore: any }) => any
  afterMigrate?: ({ stateBefore, stateAfter }: { stateBefore: any; stateAfter: any }) => any
  getSnapshot?: ({ stateBefore }: { stateBefore: Schema }) => Schema
}

export class JsonDB<Schema extends object> {
  private currentState: Schema
  private middleware: Required<JsonDBMiddleware<Schema>>
  private currentMigrationId: number | undefined

  constructor(
    initialState: Schema,
    middleware?: JsonDBMiddleware<Schema> | JsonDBMiddleware<Schema>[],
    currentMigrationId?: number
  ) {
    this.currentState = initialState
    this.currentMigrationId = currentMigrationId

    this.middleware = this.composeMiddlewares(middleware)
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
      getSnapshot: ({ stateBefore }) => stateBefore,
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
      getSnapshot: ({ stateBefore }) => {
        let state = stateBefore
        for (const fn of middlewares.map(m => m.getSnapshot)) {
          state = fn({ stateBefore: state })
        }
        return state
      },
    }
  }

  public getSnapshot(): Schema {
    return this.middleware.getSnapshot({ stateBefore: this.currentState })
  }

  public migrate<Output extends object>(
    title: string,
    apply: (i: Schema) => Output
  ): JsonDB<Output & { __migrationHistory: { id: number; createdAt: string; title: string }[] }> {
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
  }

  public transact<Result>(paths: any): (action: (state: any) => any) => Result {
    return action => {
      let state = cloneState(this.currentState)

      state = this.middleware.beforeTransact({ paths, stateBefore: state })

      const actionState = actionStateFromPaths(state, paths)

      const [newActionState, result] = this.handleTransaction(actionState, action)

      setStateFromActionState(paths, newActionState, state)

      state = this.middleware.afterTransact({ paths, stateBefore: this.currentState, stateAfter: state })

      this.currentState = state
      return result
    }
  }

  public transactAsync<Result>(paths: any): (action: (state: any) => Promise<any>) => Promise<Result> {
    return async action => {
      let state = cloneState(this.currentState)

      state = await this.middleware.beforeTransactAsync({ paths, stateBefore: state })

      const actionState = actionStateFromPaths(state, paths)

      const [newActionState, result] = await this.handleAsyncTransaction(actionState, action)

      setStateFromActionState(paths, newActionState, state)

      state = await this.middleware.afterTransactAsync({ paths, stateBefore: this.currentState, stateAfter: state })

      this.currentState = state
      return result
    }
  }

  protected handleTransaction<Result>(state: any, action: (state: any) => Result): [any, Result] {
    let result = undefined

    const newState = produce(state, (s: any) => {
      result = action(s)
    })

    return [newState, result as unknown as Result]
  }

  protected async handleAsyncTransaction<Result>(
    state: any,
    action: (state: any) => Promise<Result>
  ): Promise<[any, Result]> {
    let result = undefined

    const newState = await produce(state, async (s: any) => {
      result = await action(s)
    })

    return [newState, result as unknown as Result]
  }
}

export interface JsonDB<Schema extends object> {
  transact<K extends Paths>(paths: {
    [key in keyof K]: B.Or<
      A.Equals<O.Path<Schema, S.Split<K[key], '.'>>, never>,
      A.Equals<O.Path<Schema, S.Split<K[key], '.'>>, undefined>
    > extends 1
      ? never
      : K[key]
  }): <Result>(
    f: (state: {
      [key in keyof K]: O.Path<Schema, S.Split<K[key], '.'>>
    }) => Result
  ) => Result

  transactAsync<K extends Paths>(paths: {
    [key in keyof K]: B.Or<
      A.Equals<O.Path<Schema, S.Split<K[key], '.'>>, never>,
      A.Equals<O.Path<Schema, S.Split<K[key], '.'>>, undefined>
    > extends 1
      ? never
      : K[key]
  }): <Result>(
    f: (state: {
      [key in keyof K]: O.Path<Schema, S.Split<K[key], '.'>>
    }) => Promise<Result>
  ) => Promise<Result>
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
