import JsonDB from '../src'
import ExampleSchema from './files/example-db'
import FileStorage from '../src/FileStorage'
import { rmSync } from 'fs'
import MemoryStorage from '../src/MemoryStorage'

test('can be initialized with initial data', () => {
  const storage = new MemoryStorage<{ field: number }>({ field: 5 })
  const db = new JsonDB(storage)
  const res = db.transact({ test: 'field' })(state => {
    return state.test
  })
  expect(res).toBe(5)
})

test('can be initialized from the file', () => {
  const storage = new FileStorage<ExampleSchema>({} as ExampleSchema, {
    filePath: 'tests/files/example-db.json',
  })
  const db = new JsonDB(storage)
  const res = db.transact({ test: 'nestedSchema.stringField' })(state => {
    return state.test
  })
  expect(res).toBe('nested')
})

test('can be initialized with initial data and persist option', () => {
  const storage = new FileStorage(
    { field: 5 },
    {
      filePath: 'tests/files/example-db2.json',
    }
  )
  const db = new JsonDB(storage)
  const res = db.transact({ test: 'field' })(state => {
    return state.test
  })
  expect(res).toBe(5)
  rmSync('tests/files/example-db2.json')
})
