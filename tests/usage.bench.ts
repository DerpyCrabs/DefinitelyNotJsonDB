import { bench } from 'vitest'
import JsonDB from '../src'

bench('getting nested fields', () => {
  const db = new JsonDB({ nestedSchema: { stringField: 'nested' } })
  const res = db.transact({ test: 'nestedSchema.stringField' })(state => {
    return state.test
  })
  expect(res).toBe('nested')
})
