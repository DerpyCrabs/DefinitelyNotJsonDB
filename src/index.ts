import filePersistenceMiddleware from './middlewares/filePersistenceMiddleware'
import superjsonMiddleware from './middlewares/superjsonMiddleware'
import loggingMiddleware from './middlewares/loggingMiddleware'
import { A, O, B } from 'ts-toolbelt'
import produce, { setAutoFreeze } from 'immer'
import superjson from 'superjson'

// transaction hooks run before and after corresponding methods and allow to change db state at this point
export type AsyncJsonDBMiddleware<Schema> = {
  beforeTransactAsync?: (data: { paths: Paths; stateBefore: Readonly<Schema> }) => Promise<Schema>
  afterTransactAsync?: (data: {
    paths: Paths
    stateBefore: Readonly<Schema>
    stateAfter: Readonly<Schema>
  }) => Promise<Schema>
  beforeMigrateAsync?: (data: {
    stateBefore: Readonly<any>
    migrationTitle: string
    migrationId: number
  }) => Promise<any>
  afterMigrateAsync?: (data: {
    stateBefore: Readonly<any>
    stateAfter: Readonly<any>
    migrationTitle: string
    migrationId: number
  }) => Promise<any>
  getAsync?: (data: { paths: Paths; stateBefore: Readonly<Schema> }) => Promise<Schema>
  exportStateAsync?: (data: { stateBefore: Readonly<Schema> }) => Promise<Schema>
}

export type JsonDBMiddleware<Schema> = {
  beforeTransact?: (data: { paths: Paths; stateBefore: Readonly<Schema> }) => Schema
  afterTransact?: (data: { paths: Paths; stateBefore: Readonly<Schema>; stateAfter: Readonly<Schema> }) => Schema
  beforeMigrate?: (data: { stateBefore: Readonly<any>; migrationTitle: string; migrationId: number }) => any
  afterMigrate?: (data: {
    stateBefore: Readonly<any>
    stateAfter: Readonly<any>
    migrationTitle: string
    migrationId: number
  }) => any
  get?: (data: { paths: Paths; stateBefore: Readonly<Schema> }) => Schema
  exportState?: (data: { stateBefore: Readonly<Schema> }) => Schema
} & AsyncJsonDBMiddleware<Schema>

export class JsonDB<
  Schema extends object, // db object schema
  IsAsyncOnly extends boolean = false, // if true synchronous methods will not be available
  Middleware = IsAsyncOnly extends true ? AsyncJsonDBMiddleware<Schema> : JsonDBMiddleware<Schema> // only subset of middleware hooks available if IsAsyncOnly = true
> {
  private currentState: Schema
  private middlewares: JsonDBMiddleware<Schema>[]
  private currentMigrationId: number | undefined // number of called migrate/migrateAsync methods
  private isAsyncOnly: boolean // if true disables synchronous methods

  constructor(
    initialState: Schema,
    options?: { middleware?: Middleware | Middleware[]; isAsyncOnly?: IsAsyncOnly },
    currentMigrationId?: number
  ) {
    this.currentState = initialState
    this.currentMigrationId = currentMigrationId
    this.isAsyncOnly = options?.isAsyncOnly || false
    this.middlewares = (
      options?.middleware ? (Array.isArray(options.middleware) ? options.middleware : [options.middleware]) : []
    ) as JsonDBMiddleware<Schema>[]

    setAutoFreeze(false) // disable freezing output of immer's `produce`
  }

  public exportState: IsAsyncOnly extends true ? never : () => Schema = (() => {
    if (this.isAsyncOnly) throw new Error('exportState is not available with isAsyncOnly = true')
    let result = cloneState(this.currentState)
    for (const m of this.middlewares) {
      if (m.exportState) {
        result = m.exportState({ stateBefore: result })
      }
    }
    return result
  }) as any

  public async exportStateAsync(): Promise<Schema> {
    let result = cloneState(this.currentState)
    for (const m of this.middlewares) {
      if (m.exportStateAsync) {
        result = await m.exportStateAsync({ stateBefore: result })
      }
    }
    return result
  }

  // migrate method gets a title and an action that transforms current Schema into Output and returns new JsonDB instance with changed Schema type
  public migrate: IsAsyncOnly extends true
    ? never
    : <Output extends object>(
        title: string,
        apply: (i: Readonly<Schema>) => Output
      ) => JsonDB<Output & { __migrationHistory: { id: number; createdAt: string; title: string }[] }> = ((
    title: string,
    apply: (i: any) => any
  ) => {
    if (this.isAsyncOnly) throw new Error('migrate is not available with isAsyncOnly = true')

    this.currentMigrationId = this.currentMigrationId ? this.currentMigrationId + 1 : 1

    let state = cloneState(this.currentState) as Schema & {
      __migrationHistory: { id: number; createdAt: string; title: string }[]
    }

    let middlewareStates: { middlewareIndex: number; stateBefore: Schema }[] = []
    for (let index = 0; index < this.middlewares.length; index++) {
      const m = this.middlewares[index]
      if (m.beforeMigrate) {
        state = m.beforeMigrate({ stateBefore: state, migrationId: this.currentMigrationId, migrationTitle: title })
        middlewareStates = [{ middlewareIndex: index, stateBefore: state }, ...middlewareStates]
      }
    }

    let lastMigrationId = state.__migrationHistory
      ? Math.max(0, ...state.__migrationHistory.map((r: { id: number }) => r.id))
      : 0
    if (lastMigrationId >= (this.currentMigrationId || 0)) {
      console.debug(`Skipped migration ${this.currentMigrationId} - '${title}'`)
      return this as any
    }
    try {
      // apply migration to `state` and write a record to `state.__migrationHistory`
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

      for (let index = this.middlewares.length - 1; index >= 0; index--) {
        const m = this.middlewares[index]
        if (m.afterMigrate) {
          const stateBefore = middlewareStates.find(s => s.middlewareIndex <= index)?.stateBefore || this.currentState
          state = m.afterMigrate({
            stateBefore: stateBefore,
            stateAfter: migratedState,
            migrationId: this.currentMigrationId,
            migrationTitle: title,
          })
        }
      }

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
    apply: (i: Readonly<Schema>) => Promise<Output>
  ): Promise<JsonDB<Output & { __migrationHistory: { id: number; createdAt: string; title: string }[] }>> {
    this.currentMigrationId = this.currentMigrationId ? this.currentMigrationId + 1 : 1

    let state = cloneState(this.currentState) as Schema & {
      __migrationHistory: { id: number; createdAt: string; title: string }[]
    }

    let middlewareStates: { middlewareIndex: number; stateBefore: Schema }[] = []
    for (let index = 0; index < this.middlewares.length; index++) {
      const m = this.middlewares[index]
      if (m.beforeMigrateAsync) {
        state = await m.beforeMigrateAsync({
          stateBefore: state,
          migrationId: this.currentMigrationId,
          migrationTitle: title,
        })
        middlewareStates = [{ middlewareIndex: index, stateBefore: state }, ...middlewareStates]
      }
    }

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

      for (let index = this.middlewares.length - 1; index >= 0; index--) {
        const m = this.middlewares[index]
        if (m.afterMigrateAsync) {
          const stateBefore = middlewareStates.find(s => s.middlewareIndex <= index)?.stateBefore || this.currentState
          state = await m.afterMigrateAsync({
            stateBefore: stateBefore,
            stateAfter: migratedState,
            migrationId: this.currentMigrationId,
            migrationTitle: title,
          })
        }
      }

      this.currentState = migratedState as any
    } catch (e) {
      console.error(`Error while applying migration ${this.currentMigrationId} - '${title}'`)
      throw e
    }
    console.debug(`Applied migration ${this.currentMigrationId} - '${title}'`)

    return this as any
  }

  // get an object containing values from `this.currentState` followings the paths from `paths` argument
  public get: IsAsyncOnly extends true
    ? never
    : <Ps extends Paths>(paths: SchemaPaths<Schema, Ps>) => StateFromPaths<Schema, Ps> = ((paths: any) => {
    if (this.isAsyncOnly) throw new Error('get is not available with isAsyncOnly = true')

    let state = cloneState(this.currentState)

    for (let index = 0; index < this.middlewares.length; index++) {
      const m = this.middlewares[index]
      if (m.get) {
        state = m.get({ stateBefore: state, paths })
      }
    }

    // create object that has keys as `paths` and values that are field in `state` that were selected by `paths` values
    return actionStateFromPaths(state, paths)
  }) as any

  public getAsync: <Ps extends Paths>(paths: SchemaPaths<Schema, Ps>) => Promise<StateFromPaths<Schema, Ps>> = (async (
    paths: any
  ) => {
    let state = cloneState(this.currentState)

    for (let index = 0; index < this.middlewares.length; index++) {
      const m = this.middlewares[index]
      if (m.getAsync) {
        state = await m.getAsync({ stateBefore: state, paths })
      }
    }

    // create object that has keys as `paths` and values that are field in `state` that were selected by `paths` values
    return actionStateFromPaths(state, paths)
  }) as any

  // transact gets an object where values are paths into `this.currentState` that will be available to the action
  // immer is used to allow mutation of values from state in action
  public transact: IsAsyncOnly extends true
    ? never
    : <Ps extends Paths>(
        paths: SchemaPaths<Schema, Ps>
      ) => <Result>(
        f: (state: O.Writable<StateFromPaths<Schema, Ps>>) => Result,
        options?: { onCommit?: (r: Result) => void; onRollback?: () => void; retries?: number }
      ) => Result = ((paths: any) => {
    if (this.isAsyncOnly) throw new Error('transact is not available with isAsyncOnly = true')

    return (action: any, options: { onCommit?: (r: any) => void; onRollback?: () => void; retries?: number }) => {
      let retries = 0
      for (;;) {
        const initialState = this.currentState

        const [state, result] = this.performTransaction(initialState, paths, action)

        // rerun the transaction if some other transaction was applied to state while current transaction was executing
        if (initialState !== this.currentState) {
          if (options?.onRollback) {
            options.onRollback()
          }
          if (options?.retries && retries >= options?.retries) {
            throw new Error(`Exceeded transaction retries limit`)
          }
          retries += 1
          continue
        }
        this.currentState = state
        if (options?.onCommit) {
          options.onCommit(result)
        }
        return result
      }
    }
  }) as any

  public transactAsync: <Ps extends Paths>(
    paths: SchemaPaths<Schema, Ps>
  ) => <Result>(
    f: (state: O.Writable<StateFromPaths<Schema, Ps>>) => Promise<Result>,
    options?: { onCommit?: (r: Result) => Promise<void>; onRollback?: () => Promise<void>; retries?: number }
  ) => Promise<Result> = paths => {
    return async (action, options) => {
      let retries = 0
      for (;;) {
        const initialState = this.currentState

        const [state, result] = await this.performAsyncTransaction(initialState, paths, action)

        // rerun the transaction if some other transaction was applied to state while current transaction was executing
        if (initialState !== this.currentState) {
          if (options?.onRollback) {
            await options.onRollback()
          }
          if (options?.retries && retries >= options?.retries) {
            throw new Error(`Exceeded transaction retries limit`)
          }
          retries += 1
          continue
        }
        this.currentState = state
        if (options?.onCommit) {
          await options.onCommit(result)
        }
        return result
      }
    }
  }

  private performTransaction<Result>(initialState: any, paths: Paths, action: (state: any) => Result): [any, Result] {
    let state = cloneState(initialState)

    let middlewareStates: { middlewareIndex: number; stateBefore: Schema }[] = []
    for (let index = 0; index < this.middlewares.length; index++) {
      const m = this.middlewares[index]
      if (m.beforeTransact) {
        state = m.beforeTransact({ stateBefore: state, paths })
        middlewareStates = [{ middlewareIndex: index, stateBefore: state }, ...middlewareStates]
      }
    }

    // create object that has keys as `paths` and values that are field in `state` that were selected by `paths` values
    const actionState = actionStateFromPaths(state, paths)

    let result = undefined
    const newActionState = produce(actionState, (s: any) => {
      result = action(s)
    })

    // set `state` fields from `newActionState` following `paths` values
    state = this.middlewares.length !== 0 ? cloneState(state) : state
    setStateFromActionState(paths, newActionState, state)

    for (let index = this.middlewares.length - 1; index >= 0; index--) {
      const m = this.middlewares[index]
      if (m.afterTransact) {
        const stateBefore = middlewareStates.find(s => s.middlewareIndex <= index)?.stateBefore || initialState
        state = m.afterTransact({
          stateBefore: stateBefore,
          stateAfter: state,
          paths,
        })
      }
    }

    return [state, result as unknown as Result]
  }

  private async performAsyncTransaction<Result>(
    initialState: any,
    paths: Paths,
    action: (state: any) => Promise<Result>
  ): Promise<[any, Result]> {
    let state = cloneState(initialState)

    let middlewareStates: { middlewareIndex: number; stateBefore: Schema }[] = []
    for (let index = 0; index < this.middlewares.length; index++) {
      const m = this.middlewares[index]
      if (m.beforeTransactAsync) {
        state = await m.beforeTransactAsync({ stateBefore: state, paths })
        middlewareStates = [{ middlewareIndex: index, stateBefore: state }, ...middlewareStates]
      }
    }

    // create object that has keys as `paths` and values that are field in `state` that were selected by `paths` values
    const actionState = actionStateFromPaths(state, paths)

    let result = undefined
    const newActionState = await produce(actionState, async (s: any) => {
      result = await action(s)
    })

    // set `state` fields from `newActionState` following `paths` values
    state = this.middlewares.length !== 0 ? cloneState(state) : state
    setStateFromActionState(paths, newActionState, state)

    for (let index = this.middlewares.length - 1; index >= 0; index--) {
      const m = this.middlewares[index]
      if (m.afterTransactAsync) {
        const stateBefore = middlewareStates.find(s => s.middlewareIndex <= index)?.stateBefore || initialState
        state = await m.afterTransactAsync({
          stateBefore: stateBefore,
          stateAfter: state,
          paths,
        })
      }
    }

    return [state, result as unknown as Result]
  }
}

export type Paths = { [key: string]: readonly [string | number, ...(string | number)[]] }

type SchemaPaths<Schema extends object, Ps extends Paths> = {
  [key in keyof Ps]: B.Or<
    A.Equals<O.Path<Schema, Ps[key]>, never>,
    A.Equals<O.Path<Schema, Ps[key]>, undefined>
  > extends 1
    ? never
    : Ps[key]
}

type StateFromPaths<Schema extends object, Ps extends Paths> = {
  [key in keyof Ps]: O.Path<Schema, Ps[key]>
}

// get field value in `state` following `path`
function getViewFromPath(state: any, path: readonly (string | number)[]): any {
  let fieldPointer = state
  for (let i = 0; i < path.length; i++) {
    const field = path[i]
    if (typeof fieldPointer !== 'object' || fieldPointer === null || fieldPointer === undefined) break

    fieldPointer = fieldPointer[field]
  }
  return fieldPointer
}

// get field values in `state` following `paths` values
function actionStateFromPaths(state: any, paths: Paths): any {
  return Object.fromEntries(Object.entries(paths).map(([fieldName, path]) => [fieldName, getViewFromPath(state, path)]))
}

// set `currentState` fields from `actionState` following `paths` values
function setStateFromActionState(paths: Paths, actionState: { [key: string]: any }, currentState: any) {
  Object.entries(paths).forEach(([fieldName, path]) => {
    let fieldPointer = currentState
    for (let i = 0; i < path.length - 1; i++) {
      const field = path[i]
      if (fieldPointer === undefined || fieldPointer === null) break
      fieldPointer = fieldPointer[field]
    }
    if (fieldPointer !== undefined && fieldPointer !== null)
      fieldPointer[path[path.length - 1]] = actionState[fieldName]
  })
}

function cloneState<Schema>(state: Schema): Schema {
  return superjson.parse(superjson.stringify(state))
}

export default JsonDB
export { filePersistenceMiddleware, superjsonMiddleware, loggingMiddleware }
