import JsonDB from '../src'
import ExampleSchema from './files/example-db'
import { rm } from 'fs/promises'
import filePersistenceMiddleware from '../src/middlewares/filePersistenceMiddleware'

test('can be initialized with initial data', () => {
  const db = new JsonDB({ field: 5 })
  const res = db.transact({ test: ['field'] })(state => {
    state.test = 10
    return state.test
  })
  expect(res).toBe(10)
  const res2 = db.get({ test: ['field'] }).test
  expect(res2).toBe(10)
})

test('can be initialized from the file', () => {
  const db = new JsonDB({} as ExampleSchema, { middleware: filePersistenceMiddleware('tests/files/example-db.json') })
  const res = db.get({ test: ['nestedSchema', 'stringField'] }).test
  expect(res).toBe('nested')
})

test('can be initialized with initial data and persist option', async () => {
  const db = new JsonDB({ field: 5 }, { middleware: filePersistenceMiddleware('tests/files/example-db2.json') })
  const res = db.transact({ test: ['field'] })(state => {
    state.test = 10
    return state.test
  })
  expect(res).toBe(10)
  const res2 = db.transactAsync({ test: ['field'] })(async state => {
    return new Promise(r => {
      state.test = state.test + 5
      r(state.test)
    })
  })
  expect(await res2).toBe(15)
  afterEach(async () => {
    try {
      await rm('tests/files/example-db2.json')
    } catch {}
  })
})
