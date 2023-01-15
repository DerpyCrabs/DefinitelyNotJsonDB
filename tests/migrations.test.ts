import JsonDB from '../src'

test('can apply migration', () => {
  const db = new JsonDB({ field: 5 }).migrate('migration', state => ({
    field2: state.field.toString(),
  }))
  expect(db.exportState()).toMatchObject({ field2: '5' })
  expect(db.exportState().__migrationHistory.length).toBe(1)
})

test('can apply multiple migrations', () => {
  const db = new JsonDB({ field: 5 })
    .migrate('migration 1', state => ({
      field2: state.field.toString(),
    }))
    .migrate('migration 2', state => ({ field3: Number(state.field2) }))
    .migrate('migration 3', ({ field3 }) => ({ field3: Number(field3) }))

  expect(db.exportState()).toMatchObject({ field3: 5 })
  expect(db.exportState().__migrationHistory.length).toBe(3)
})

test("doesn't apply already applied migrations", () => {
  const db = new JsonDB({ field: 5 }).migrate('migration 1', state => ({
    field: state.field + 1,
  }))

  const secondDb = new JsonDB(db.exportState())
    .migrate('migration 1', state => ({
      field: state.field + 1,
    }))
    .migrate('migration 2', state => ({
      field: state.field + 2,
    }))
  expect(db.exportState()).toMatchObject({ field: 6 })
  expect(db.exportState().__migrationHistory.length).toBe(1)
  expect(secondDb.exportState()).toMatchObject({ field: 8 })
  expect(secondDb.exportState().__migrationHistory.length).toBe(2)
})

test("doesn't continue after broken migration", () => {
  const db = new JsonDB({ field: 5 })
    .migrate('migration 1', state => ({
      field: state.field + 1,
    }))
    .migrate('migration 2', state => ({
      field: state.field + 2,
    }))

  try {
    db.migrate('bad migration', state => {
      throw 'error'
      return {
        field: state.field + 1,
      }
    }).migrate('migration 4', state => ({
      field: state.field + 4,
    }))
  } catch (e) {}
  expect(db.exportState()).toMatchObject({ field: 8 })
  expect(db.exportState().__migrationHistory.length).toBe(2)
})
