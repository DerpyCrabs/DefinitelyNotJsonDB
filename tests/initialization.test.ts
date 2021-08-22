import JsonDB from '../src'
import ExampleSchema from './files/example-db'

test('can be initialized with initial data', () => {
  const db = new JsonDB<{ field: number }>({ field: 5 })
  const res = db.transact({ test: 'field' })((state) => {
    return state.test
  })
  expect(res).toBe(5)
})

test('can be initialized from the file', () => {
  const db = new JsonDB<ExampleSchema>({
    persist: 'tests/files/example-db.json',
  })
  const res = db.transact({ test: 'nestedSchema.stringField' })((state) => {
    return state.test
  })
  expect(res).toBe('nested')
})
