import { DBStorage, Paths } from './Storage'
import * as R from 'ramda'
import produce from 'immer'

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

  public transact<Result>(paths?: any): (action: (state: any) => any) => Result {
    if (!paths) {
      return action => {
        const state = this.currentState

        const newState = action(state) as any

        this.currentState = newState

        return newState
      }
    } else {
      const stateLens = pathsToStateLens(paths)
      return action => {
        const state = stateLensToActionState(stateLens, this.currentState)

        const [newState, result] = this.handleTransaction(state, action)

        this.currentState = actionStateToState(stateLens, newState, this.currentState)

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

function pathsToStateLens(paths: Paths): StateLens {
  return Object.fromEntries(Object.entries(paths).map(([fieldName, path]) => [fieldName, R.lensPath(splitPath(path))]))
}

function stateLensToActionState<State>(stateLens: StateLens, currentState: State): ActionState {
  return Object.fromEntries(
    Object.entries(stateLens).map(([fieldName, lens]) => [fieldName, R.view(lens, currentState)])
  )
}

function actionStateToState<State>(stateLens: StateLens, actionState: ActionState, currentState: State): State {
  let intermittentState = currentState
  Object.entries(stateLens).forEach(([fieldName, lens]) => {
    intermittentState = R.set(lens, actionState[fieldName])(intermittentState)
  })
  return intermittentState
}

function splitPath(path: string): (number | string)[] {
  return path.split('.').map(p => (/^\d+$/.test(p) ? Number.parseInt(p, 10) : p))
}

type StateLens = { [key: string]: R.Lens<any, any> }
type ActionState = { [key: string]: any }
