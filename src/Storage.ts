import { Paths } from './utils'

export abstract class DBStorage<Schema extends object> {
  public abstract getSnapshot(): Schema

  public abstract transact<Result>(paths?: Paths): (action: (state: any) => Result) => Result
}
