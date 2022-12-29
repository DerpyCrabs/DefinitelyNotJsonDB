import { DBStorage } from './Storage'

export type Migration<Input extends object, Output extends object> = {
  id: number
  apply: (data: Input) => Output
}

type MigrationsOutput<Ms extends Migration<any, any>[], Input extends object> = Ms extends [
  Migration<Input, infer Output>,
  ...infer RestMs
]
  ? RestMs extends Migration<any, any>[]
    ? MigrationsOutput<RestMs, Output>
    : never
  : Ms extends Migration<any, any>[]
  ? Input
  : never

export default function migrateStorage<InputSchema extends object, Migrations extends Migration<any, any>[]>(
  migrations: Migrations,
  storage: DBStorage<InputSchema>
): DBStorage<MigrationsOutput<Migrations, InputSchema> & { __lastMigration?: number }> {
  storage.transact()(state => {
    let migratedState = state
    for (const migration of migrations) {
      if (migratedState.__lastMigration && migratedState.__lastMigration >= migration.id) {
        console.debug(`Skipped migration with id ${migration.id}`)
        continue
      }
      try {
        migratedState = { ...migration.apply(migratedState), __lastMigration: migration.id }
      } catch (e) {
        console.error(`Error while applying migration with id ${migration.id}`)
        throw e
      }
      console.debug(`Applied migration with id ${migration.id}`)
    }
    return migratedState
  })
  return storage as DBStorage<MigrationsOutput<Migrations, InputSchema> & { __lastMigration?: number }>
}
