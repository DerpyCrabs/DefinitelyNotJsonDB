import { bench } from 'vitest'
import JsonDB from '../src'
import MemoryStorage from '../src/MemoryStorage'

bench('getting nested fields', () => {
  const storage = new MemoryStorage({ nestedSchema: { stringField: 'nested' } })
  const db = new JsonDB(storage)
  const res = db.transact({ test: 'nestedSchema.stringField' })(state => {
    return state.test
  })
  expect(res).toBe('nested')
})
