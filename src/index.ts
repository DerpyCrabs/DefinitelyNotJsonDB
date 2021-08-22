import { produce } from 'immer'
import * as R from 'ramda'
import fs from 'fs'
import type { A, O } from 'ts-toolbelt'
import type { Split } from './Split'

export class JsonDB<Schema extends object> {
  currentState: Schema
  options: JsonDBOptions

  constructor(
    initialStateOrOptions: Schema | (JsonDBOptions & { persist: string }),
    options?: typeof initialStateOrOptions extends Schema
      ? JsonDBOptions
      : never
  ) {
    if ((initialStateOrOptions as JsonDBOptions).persist !== undefined) {
      this.options = initialStateOrOptions as JsonDBOptions & {
        persist: string
      }
      this.currentState = JSON.parse(
        fs.readFileSync(this.options.persist as string, { encoding: 'utf-8' })
      ) as Schema
    } else {
      this.currentState = initialStateOrOptions as Schema
      this.options = options || {}
    }
  }

  getSnapshot(f: (state: Schema) => void): void {
    f(this.currentState)
  }

  transact<R>(paths: Paths): (action: (state: any) => R) => R {
    const stateLens = pathsToStateLens(paths)
    return (action: (state: any) => R): R => {
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

  private handleTransaction<R>(
    state: any,
    action: (state: any) => R
  ): [any, R] {
    let result = undefined

    const newState = produce(state, (s: any) => {
      result = action(s)
    })

    return [newState, result as unknown as R]
  }
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

function splitPath(path: string): (number | string)[] {
  return path
    .split('.')
    .map((p) => (/^\d+$/.test(p) ? Number.parseInt(p, 10) : p))
}

type Paths = { [key: string]: string }
type StateLens = { [key: string]: R.Lens<any, any> }
type ActionState = { [key: string]: any }

export interface JsonDB<Schema extends object> {
  transact<R, K extends Paths>(
    state: {
      [key in keyof K]: A.Equals<
        O.Path<Schema, Split<K[key], '.'>>,
        undefined
      > extends 1
        ? never
        : K[key]
    }
  ): (
    f: (
      state: {
        [key in keyof K]: O.Path<Schema, Split<K[key], '.'>>
      }
    ) => R
  ) => R
}

export interface JsonDBOptions {
  persist?: string
}

export default JsonDB
