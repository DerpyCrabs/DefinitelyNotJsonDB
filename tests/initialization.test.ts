import JsonDB from '../src'
import ExampleSchema from './files/example-db'
import FileStorage from '../src/FileStorage'

test('can be initialized with initial data', () => {
  const storage = new FileStorage<{ field: number }>({ field: 5 })
  const db = new JsonDB(storage)
  const res = db.transact({ test: 'field' })((state) => {
    return state.test
  })
  expect(res).toBe(5)
})

test('can be initialized from the file', () => {
  const storage = new FileStorage<ExampleSchema>({
    persist: 'tests/files/example-db.json',
  })
  const db = new JsonDB(storage)
  const res = db.transact({ test: 'nestedSchema.stringField' })((state) => {
    return state.test
  })
  expect(res).toBe('nested')
})
