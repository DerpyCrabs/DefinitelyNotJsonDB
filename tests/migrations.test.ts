import MemoryStorage from '../src/MemoryStorage'

test('can apply migration', () => {
  const storage = new MemoryStorage({ field: 5 }).migrate('migration', state => ({
    field2: state.field.toString(),
  }))
  expect(storage.getSnapshot()).toMatchObject({ field2: '5' })
  expect(storage.getSnapshot().__migrationHistory.length).toBe(1)
})

test('can apply multiple migrations', () => {
  const storage = new MemoryStorage<{ field: number }>({ field: 5 })
    .migrate('migration 1', state => ({
      field2: state.field.toString(),
    }))
    .migrate('migration 2', state => ({ field3: Number(state.field2) }))
    .migrate('migration 3', ({ field3 }) => ({ field3: Number(field3) }))

  expect(storage.getSnapshot()).toMatchObject({ field3: 5 })
  expect(storage.getSnapshot().__migrationHistory.length).toBe(3)
})

test("doesn't apply already applied migrations", () => {
  const storage = new MemoryStorage<{ field: number }>({ field: 5 }).migrate('migration 1', state => ({
    field: state.field + 1,
  }))

  const secondStorage = new MemoryStorage<{ field: number }>(storage.getSnapshot())
    .migrate('migration 1', state => ({
      field: state.field + 1,
    }))
    .migrate('migration 2', state => ({
      field: state.field + 2,
    }))
  expect(storage.getSnapshot()).toMatchObject({ field: 6 })
  expect(storage.getSnapshot().__migrationHistory.length).toBe(1)
  expect(secondStorage.getSnapshot()).toMatchObject({ field: 8 })
  expect(secondStorage.getSnapshot().__migrationHistory.length).toBe(2)
})

test("doesn't continue after broken migration", () => {
  const storage = new MemoryStorage<{ field: number }>({ field: 5 })
    .migrate('migration 1', state => ({
      field: state.field + 1,
    }))
    .migrate('migration 2', state => ({
      field: state.field + 2,
    }))

  try {
    storage
      .migrate('bad migration', state => {
        throw 'error'
        return {
          field: state.field + 1,
        }
      })
      .migrate('migration 4', state => ({
        field: state.field + 4,
      }))
  } catch (e) {}
  expect(storage.getSnapshot()).toMatchObject({ field: 8 })
  expect(storage.getSnapshot().__migrationHistory.length).toBe(2)
})
