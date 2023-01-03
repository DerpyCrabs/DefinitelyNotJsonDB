import JsonDB from '../src'
import ExampleSchema from './files/example-db'
import { existsSync, rmSync } from 'fs'
import filePersistenceMiddleware from '../src/middlewares/filePersistenceMiddleware'

test('can be initialized with initial data', () => {
  const db = new JsonDB({ field: 5 })
  const res = db.transact({ test: 'field' })(state => {
    state.test = 10
    return state.test
  })
  expect(res).toBe(10)
  const res2 = db.transact({ test: 'field' })(state => {
    return state.test
  })
  expect(res2).toBe(10)
})

test('can have async transactions', async () => {
  const db = new JsonDB({ field: 5 })
  const res = db.transactAsync({ test: 'field' })(async state => {
    state.test = 10
    return new Promise(r => r(state.test))
  })
  expect(await res).toBe(10)
  const res2 = db.transactAsync({ test: 'field' })(async state => {
    return new Promise(r => r(state.test))
  })
  expect(await res2).toBe(10)
})

test('can be initialized from the file', () => {
  const db = new JsonDB({} as ExampleSchema, filePersistenceMiddleware('tests/files/example-db.json'))
  const res = db.transact({ test: 'nestedSchema.stringField' })(state => {
    return state.test
  })
  expect(res).toBe('nested')
})

test('can be initialized with initial data and persist option', async () => {
  const db = new JsonDB({ field: 5 }, filePersistenceMiddleware('tests/files/example-db2.json'))
  const res = db.transact({ test: 'field' })(state => {
    state.test = 10
    return state.test
  })
  expect(res).toBe(10)
  const res2 = db.transactAsync({ test: 'field' })(async state => {
    return new Promise(r => {
      state.test = state.test + 5
      r(state.test)
    })
  })
  expect(await res2).toBe(15)
  if (existsSync('tests/files/example-db2.json')) rmSync('tests/files/example-db2.json')
})
