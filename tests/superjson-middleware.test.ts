import JsonDB, { FileStorage, JsonDBOptions } from '../src'
import MemoryStorage from '../src/MemoryStorage'
import superjson from 'superjson'
import { rmSync } from 'fs'

const superjsonMiddleware: JsonDBOptions<any> = {
  beforeTransact({ stateBefore: { __superjsonMeta, ...stateBefore } }) {
    return superjson.deserialize({ json: stateBefore, meta: __superjsonMeta || {} })
  },
  afterTransact({ stateAfter }) {
    const { json, meta } = superjson.serialize(stateAfter)
    return { ...(json as any), __superjsonMeta: meta } as any
  },
}

test('superjson middleware works with memory storage', () => {
  const storage = new MemoryStorage<{ field: number; field2: Date }>({ field: 5, field2: new Date() })
  const db = new JsonDB(storage, superjsonMiddleware)
  const res = db.transact({ test: 'field2' })(state => {
    return state.test
  })
  expect(typeof res).toBe('object')
  const res2 = db.transact({ test: 'field2' })(state => {
    return state.test
  })
  expect(typeof res2).toBe('object')
})

test('superjson middleware works with file storage', () => {
  const storage = new FileStorage(
    { field: 5, field2: new Date() },
    {
      filePath: 'tests/files/example-db3.json',
    }
  )

  const db = new JsonDB(storage, superjsonMiddleware)
  const res = db.transact({ test: 'field2' })(state => {
    return state.test
  })
  expect(typeof res).toBe('object')
  const res2 = db.transact({ test: 'field2' })(state => {
    return state.test
  })
  expect(typeof res2).toBe('object')
  rmSync('tests/files/example-db3.json')
})
