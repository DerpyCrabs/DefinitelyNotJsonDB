import JsonDB from '../src'

test('Single migration has correct type', () => {
  assertType<JsonDB<{ field2: string; __migrationHistory: { id: number; createdAt: string; title: string }[] }>>(
    new JsonDB({ field: 5 }).migrate('migration', state => ({
      field2: state.field.toString(),
    }))
  )
})

test('Multiple migrations have correct type', () => {
  assertType<JsonDB<{ field3: number; __migrationHistory: { id: number; createdAt: string; title: string }[] }>>(
    new JsonDB<{ field: number }>({ field: 5 })
      .migrate('migration 1', state => ({
        field2: state.field.toString(),
      }))
      .migrate('migration 2', state => ({ field3: Number(state.field2) }))
      .migrate('migration 3', ({ field3 }) => ({ field3: Number(field3) }))
  )
})
