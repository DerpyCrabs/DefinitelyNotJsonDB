import JsonDB, { JsonDBMiddleware } from '../src'
import superjson from 'superjson'
import { existsSync, rmSync } from 'fs'
import filePersistenceMiddleware from '../src/middlewares/filePersistenceMiddleware'

const superjsonMiddleware = <Schema>(): JsonDBMiddleware<Schema> => ({
  beforeTransact({ stateBefore: { __superjsonMeta, ...stateBefore } }: any) {
    return superjson.deserialize({ json: stateBefore, meta: __superjsonMeta || {} })
  },
  afterTransact({ stateAfter }) {
    const { json, meta } = superjson.serialize(stateAfter)
    return { ...(json as any), __superjsonMeta: meta } as any
  },
  async beforeTransactAsync({ stateBefore: { __superjsonMeta, ...stateBefore } }: any) {
    return superjson.deserialize({ json: stateBefore, meta: __superjsonMeta || {} })
  },
  async afterTransactAsync({ stateAfter }) {
    const { json, meta } = superjson.serialize(stateAfter)
    return { ...(json as any), __superjsonMeta: meta } as any
  },
})

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
  if (existsSync('tests/files/example-db3.json')) rmSync('tests/files/example-db3.json')
})
