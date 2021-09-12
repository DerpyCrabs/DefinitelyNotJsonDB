import { DBStorage } from './Storage'
import fs from 'fs'
import { Paths, splitPath } from './utils'
import R from 'ramda'
import produce from 'immer'

export default class FileStorage<
  Schema extends object
> extends DBStorage<Schema> {
  currentState: Schema
  options: FileStorageOptions

  constructor(
    initialStateOrOptions: Schema | (FileStorageOptions & { persist: string }),
    options?: typeof initialStateOrOptions extends { persist: string }
      ? never
      : FileStorageOptions
  ) {
    super()
    if ((initialStateOrOptions as FileStorageOptions).persist !== undefined) {
      this.options = initialStateOrOptions as FileStorageOptions & {
        persist: string
      }
      this.currentState = JSON.parse(
        fs.readFileSync(this.options.persist as string, { encoding: 'utf-8' })
      ) as Schema
    } else {
      this.options = options || {}
      if (this.options.persist && fs.existsSync(this.options.persist)) {
        this.currentState = JSON.parse(
          fs.readFileSync(this.options.persist as string, { encoding: 'utf-8' })
        ) as Schema
      } else {
        this.currentState = initialStateOrOptions as Schema
      }
    }
  }

  public getSnapshot(): Schema {
    return this.currentState
  }

  public transact<Result>(
    paths: Paths
  ): (action: (state: any) => Result) => Result {
    const stateLens = pathsToStateLens(paths)
    return (action: (state: any) => Result): Result => {
      const state = stateLensToActionState(stateLens, this.currentState)

      const [newState, result] = this.handleTransaction(state, action)

      this.currentState = actionStateToState(
        stateLens,
        newState,
        this.currentState
      )

      if (this.options.persist) {
        fs.writeFileSync(
          this.options.persist,
          JSON.stringify(this.currentState),
          { encoding: 'utf-8' }
        )
      }
      return result
    }
  }

  protected handleTransaction<Result>(
    state: any,
    action: (state: any) => Result
  ): [any, Result] {
    let result = undefined

    const newState = produce(state, (s: any) => {
      result = action(s)
    })

    return [newState, result as unknown as Result]
  }
}

export interface FileStorageOptions {
  persist?: string
}

function pathsToStateLens(paths: Paths): StateLens {
  return Object.fromEntries(
    Object.entries(paths).map(([fieldName, path]) => [
      fieldName,
      R.lensPath(splitPath(path)),
    ])
  )
}

function stateLensToActionState<State>(
  stateLens: StateLens,
  currentState: State
): ActionState {
  return Object.fromEntries(
    Object.entries(stateLens).map(([fieldName, lens]) => [
      fieldName,
      R.view(lens, currentState),
    ])
  )
}

function actionStateToState<State>(
  stateLens: StateLens,
  actionState: ActionState,
  currentState: State
): State {
  let intermittentState = currentState
  Object.entries(stateLens).forEach(([fieldName, lens]) => {
    intermittentState = R.set(lens, actionState[fieldName])(intermittentState)
  })
  return intermittentState
}

type StateLens = { [key: string]: R.Lens<any, any> }
type ActionState = { [key: string]: any }
