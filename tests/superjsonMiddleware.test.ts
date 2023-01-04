import JsonDB from '../src'
import { existsSync, rmSync } from 'fs'
import filePersistenceMiddleware from '../src/middlewares/filePersistenceMiddleware'
import superjsonMiddleware from '../src/middlewares/superjsonMiddleware'

test('superjson middleware works with memory storage', () => {
  const db = new JsonDB({ field: 5, field2: new Date() }, superjsonMiddleware())
  const res = db.transact({ test: 'field2' })(state => {
    return state.test
  })
  expect(typeof res).toBe('object')
  const res2 = db.transact({ test: 'field2' })(state => {
    return state.test
  })
  expect(typeof res2).toBe('object')
})

test('superjson middleware works with file storage', async () => {
  const db = new JsonDB({ field: 5, field2: new Date() }, [
    filePersistenceMiddleware('tests/files/example-db3.json'),
    superjsonMiddleware(),
  ])

  const res = db.transactAsync({ test: 'field2' })(async state => {
    return new Promise(r => r(state.test))
  })
  expect(typeof (await res)).toBe('object')
  const res2 = db.transact({ test: 'field2' })(state => {
    return state.test
  })
  expect(typeof res2).toBe('object')
})

afterEach(() => {
  if (existsSync('tests/files/example-db3.json')) rmSync('tests/files/example-db3.json')
})
