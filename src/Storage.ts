export type Paths = { [key: string]: string }

export abstract class DBStorage<Schema extends object> {
  public abstract getSnapshot(): Schema

  public abstract transact<Result>(paths?: Paths): (action: (state: any) => Result) => Result
  public abstract transact(): (action: (state: Schema) => Schema) => void

  public abstract migrate<Output extends object>(
    title: string,
    apply: (i: Schema) => Output
  ): DBStorage<Output & { __migrationHistory: { id: number; createdAt: string; title: string }[] }>
}
