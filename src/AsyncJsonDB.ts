import { A, O, B, S } from 'ts-toolbelt'
import produce from 'immer'
import { actionStateFromPaths, cloneState, Paths, setStateFromActionState } from './common'

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

export class AsyncJsonDB<Schema extends object> {
  protected currentState: Schema
  protected middleware: Required<AsyncJsonDBMiddleware<Schema>>
  protected currentMigrationId: number | undefined

  constructor(
    initialState: Schema,
    middleware?: AsyncJsonDBMiddleware<Schema> | AsyncJsonDBMiddleware<Schema>[],
    currentMigrationId?: number
  ) {
    this.currentState = initialState
    this.currentMigrationId = currentMigrationId

    this.middleware = this.composeMiddlewares(middleware)
  }

  protected composeMiddlewares(
    middleware?: AsyncJsonDBMiddleware<Schema> | AsyncJsonDBMiddleware<Schema>[]
  ): Required<AsyncJsonDBMiddleware<Schema>> {
    const noopMiddleware: Required<AsyncJsonDBMiddleware<Schema>> = {
      beforeTransactAsync: async ({ stateBefore }) => stateBefore,
      afterTransactAsync: async ({ stateAfter }) => stateAfter,
      beforeMigrateAsync: async ({ stateBefore }) => stateBefore,
      afterMigrateAsync: async ({ stateAfter }) => stateAfter,
      getSnapshotAsync: async ({ stateBefore }) => stateBefore,
    }

    const middlewares: Required<AsyncJsonDBMiddleware<Schema>>[] = middleware
      ? Array.isArray(middleware)
        ? middleware.map(m => ({ ...noopMiddleware, ...m }))
        : [{ ...noopMiddleware, ...middleware }]
      : [noopMiddleware]

    return {
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
      getSnapshotAsync: async ({ stateBefore }) => {
        let state = stateBefore
        for (const fn of middlewares.map(m => m.getSnapshotAsync)) {
          state = await fn({ stateBefore: state })
        }
        return state
      },
    }
  }

  public getSnapshotAsync(): Promise<Schema> {
    return this.middleware.getSnapshotAsync({ stateBefore: this.currentState })
  }

  public async migrateAsync<Output extends object>(
    title: string,
    apply: (i: Schema) => Promise<Output>
  ): Promise<AsyncJsonDB<Output & { __migrationHistory: { id: number; createdAt: string; title: string }[] }>> {
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

export interface AsyncJsonDB<Schema extends object> {
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
