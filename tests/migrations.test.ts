import { FileStorage, migrateStorage } from '../src'

test('can apply migration', () => {
  const storage = new FileStorage<{ field: number }>({ field: 5 })
  const migratedStorage = migrateStorage(
    [
      {
        id: 1,
        apply: state => ({
          field2: state.field.toString(),
        }),
      },
    ],
    storage
  )
  expect(migratedStorage.getSnapshot()).toStrictEqual({ field2: '5', __lastMigration: 1 })
})

test('can apply multiple migrations', () => {
  const storage = new FileStorage<{ field: number }>({ field: 5 })
  const migratedStorage = migrateStorage(
    [
      {
        id: 1,
        apply: state => ({
          field2: state.field.toString(),
        }),
      },
      { id: 2, apply: state => ({ field3: Number(state.field2) }) },
    ],
    storage
  )
  expect(migratedStorage.getSnapshot()).toStrictEqual({ field3: 5, __lastMigration: 2 })
})
