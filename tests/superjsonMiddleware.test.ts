import JsonDB from '../src'
import { existsSync, rmSync } from 'fs'
import filePersistenceMiddleware from '../src/middlewares/filePersistenceMiddleware'
import superjsonMiddleware from '../src/middlewares/superjsonMiddleware'

test('works with memory storage', () => {
  const db = new JsonDB({ field: 5, field2: new Date() }, { middleware: superjsonMiddleware() })
  const res = db.transact({ test: 'field2' })(state => {
    return state.test
  })
  expect(typeof res).toBe('object')
  const res2 = db.transact({ test: 'field2' })(state => {
    return state.test
  })
  expect(typeof res2).toBe('object')
})

test('works with file storage', async () => {
  const db = new JsonDB(
    { field: 5, field2: new Date() },
    { middleware: [filePersistenceMiddleware('tests/files/example-db3.json'), superjsonMiddleware()] }
  )

  const res = db.transactAsync({ test: 'field2' })(async state => {
    return new Promise(r => r(state.test))
  })
  expect(typeof (await res)).toBe('object')
  const res2 = db.transact({ test: 'field2' })(state => {
    return state.test
  })
  expect(typeof res2).toBe('object')
})

test(`doesn't set getSnapshot/getSnapshotAsync hooks to not break backups`, () => {
  const db = new JsonDB({ field: 5, field2: new Date() }, { middleware: [superjsonMiddleware()] })
  db.transact({ field: 'field' })(state => {
    state.field = 10
  })
  const backup = JSON.parse(JSON.stringify(db.getSnapshot()))

  const restoredDb = new JsonDB(backup, { middleware: [superjsonMiddleware()] })
  restoredDb.transact({ field: 'field', field2: 'field2' })(state => {
    expect(state.field).toBe(10)
    expect(typeof state.field2).toBe('object')
  })
})

afterEach(() => {
  if (existsSync('tests/files/example-db3.json')) rmSync('tests/files/example-db3.json')
})
