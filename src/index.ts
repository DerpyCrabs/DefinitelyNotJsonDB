import type { A, O, B } from 'ts-toolbelt'
import FileStorage from './FileStorage'
import type { Split } from './Split'
import { DBStorage } from './Storage'
import { Paths } from './utils'

export class JsonDB<Schema extends object> {
  storage: DBStorage<Schema>

  constructor(storage: DBStorage<Schema>) {
    this.storage = storage
  }

  getSnapshot(): Schema {
    return this.storage.getSnapshot()
  }

  transact(paths: {
    [key: string]: never
  }): <Result>(action: (state: any) => Result) => Result {
    return this.storage.transact(paths)
  }
}

export interface JsonDB<Schema extends object> {
  transact<K extends Paths>(
    paths: {
      [key in keyof K]: B.Or<
        A.Equals<O.Path<Schema, Split<K[key], '.'>>, never>,
        A.Equals<O.Path<Schema, Split<K[key], '.'>>, undefined>
      > extends 1
        ? never
        : K[key]
    }
  ): <Result>(
    f: (
      state: {
        [key in keyof K]: O.Path<Schema, Split<K[key], '.'>>
      }
    ) => Result
  ) => Result
}

export default JsonDB

export { FileStorage, DBStorage }
