import type { A, O, B } from 'ts-toolbelt'
import FileStorage from './FileStorage'
import type { Split } from './Split'
import { DBStorage, Paths } from './Storage'

export type JsonDBOptions<Schema> = {
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
}

export class JsonDB<Schema extends object> {
  storage: DBStorage<Schema>
  options?: JsonDBOptions<Schema>

  constructor(storage: DBStorage<Schema>, options?: JsonDBOptions<Schema>) {
    this.storage = storage
    this.options = options
  }

  getSnapshot(): Schema {
    return this.storage.getSnapshot()
  }

  transact(paths: { [key: string]: never }): <Result>(action: (state: any) => Result) => Result {
    return this.storage.transact(paths, this.options)
  }
  transactAsync(paths: { [key: string]: never }): <Result>(action: (state: any) => Promise<Result>) => Promise<Result> {
    return this.storage.transactAsync(paths, this.options)
  }
}

export interface JsonDB<Schema extends object> {
  transact<K extends Paths>(paths: {
    [key in keyof K]: B.Or<
      A.Equals<O.Path<Schema, Split<K[key], '.'>>, never>,
      A.Equals<O.Path<Schema, Split<K[key], '.'>>, undefined>
    > extends 1
      ? never
      : K[key]
  }): <Result>(
    f: (state: {
      [key in keyof K]: O.Path<Schema, Split<K[key], '.'>>
    }) => Result
  ) => Result

  transactAsync<K extends Paths>(paths: {
    [key in keyof K]: B.Or<
      A.Equals<O.Path<Schema, Split<K[key], '.'>>, never>,
      A.Equals<O.Path<Schema, Split<K[key], '.'>>, undefined>
    > extends 1
      ? never
      : K[key]
  }): <Result>(
    f: (state: {
      [key in keyof K]: O.Path<Schema, Split<K[key], '.'>>
    }) => Promise<Result>
  ) => Promise<Result>
}

export default JsonDB

export { FileStorage, DBStorage }
