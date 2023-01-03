import { DBStorage, Paths } from './Storage'
import produce from 'immer'
import { JsonDBOptions } from '.'
import structuredClone from '@ungap/structured-clone'

export default class MemoryStorage<Schema extends object> extends DBStorage<Schema> {
  currentState: Schema
  currentMigrationId: number | undefined

  constructor(initialState: Schema, currentMigrationId?: number) {
    super()
    this.currentMigrationId = currentMigrationId
    this.currentState = initialState
  }

  public getSnapshot(): Schema {
    return this.currentState
  }

  public migrate<Output extends object>(
    title: string,
    apply: (i: Schema) => Output
  ): DBStorage<Output & { __migrationHistory: { id: number; createdAt: string; title: string }[] }> {
    this.currentMigrationId = this.currentMigrationId ? this.currentMigrationId + 1 : 1
    this.transact()(state => {
      let migratedState = state
      let lastMigrationId = state.__migrationHistory
        ? Math.max(0, ...state.__migrationHistory.map((r: { id: number }) => r.id))
        : 0
      if (lastMigrationId >= (this.currentMigrationId || 0)) {
        console.debug(`Skipped migration ${this.currentMigrationId} - '${title}'`)
        return state
      }
      try {
        migratedState = {
          ...(apply(migratedState) as any),
          __migrationHistory: [
            ...(state.__migrationHistory || []),
            {
              id: this.currentMigrationId,
              title: title,
              appliedAt: new Date(),
            },
          ],
        }
      } catch (e) {
        console.error(`Error while applying migration ${this.currentMigrationId} - '${title}'`)
        throw e
      }
      console.debug(`Applied migration ${this.currentMigrationId} - '${title}'`)
      return migratedState
    })

    return this as any
  }

  public transact<Result>(paths?: any, options?: JsonDBOptions<Schema>): (action: (state: any) => any) => Result {
    if (!paths) {
      return action => {
        const state = this.currentState

        const newState = action(state) as any

        this.currentState = newState

        return newState
      }
    } else {
      return action => {
        let state = structuredClone(this.currentState)
        if (options?.beforeTransact) {
          state = options.beforeTransact({ paths, stateBefore: state })
        }
        const actionState = actionStateFromPaths(state, paths)

        const [newActionState, result] = this.handleTransaction(actionState, action)

        setStateFromActionState(paths, newActionState, state)
        if (options?.afterTransact) {
          state = options.afterTransact({ paths, stateBefore: this.currentState, stateAfter: state })
        }
        this.currentState = state
        return result
      }
    }
  }

  protected handleTransaction<Result>(state: any, action: (state: any) => Result): [any, Result] {
    let result = undefined

    const newState = produce(state, (s: any) => {
      result = action(s)
    })

    return [newState, result as unknown as Result]
  }
}

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
    splitPath(path).forEach(field => {
      fieldPointer = fieldPointer[field]
    })
    fieldPointer = actionState[fieldName]
  })
}

function splitPath(path: string): (number | string)[] {
  return path.split('.').map(p => (/^\d+$/.test(p) ? Number.parseInt(p, 10) : p))
}
