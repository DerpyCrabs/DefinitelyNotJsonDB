import JsonDB from '../src'

test('transact returns the type of returned action value', () => {
  const db = new JsonDB({ field: 5 })
  const value = db.transact({ test: ['field'] } as const)(state => {
    state.test = 10
  })
  expectTypeOf(value).toBeVoid()
  const value2 = db.transact({ test: ['field'] } as const)(state => {
    state.test = 10
    return 15
  })
  assertType<number>(value2)
  const value3 = db.transact({ test: ['field'] } as const)(state => {
    state.test = 10
    return state
  })
  assertType<{ test: number }>(value3)
})

test('transactAsync returns the type of returned action value', async () => {
  const db = new JsonDB({ field: 5 })
  const value = await db.transactAsync({ test: ['field'] } as const)(async state => {
    state.test = 10
  })
  expectTypeOf(value).toBeVoid()
  const value2 = await db.transactAsync({ test: ['field'] } as const)(async state => {
    state.test = 10
    return 15
  })
  assertType<number>(value2)
  const value3 = await db.transactAsync({ test: ['field'] } as const)(async state => {
    state.test = 10
    return state
  })
  assertType<{ test: number }>(value3)
})

test('transact action receives state with types from Schema', async () => {
  const db = new JsonDB({ field: 5, field2: 's', field3: { test: 't' } })
  db.transact({ test: ['field'], test2: ['field2'] } as const)(state => {
    assertType<{ test: number; test2: string }>(state)
  })
  db.transact({ test: ['field'] } as const)(state => {
    assertType<{ test: number }>(state)
  })
  db.transact({ test: ['field3'] } as const)(state => {
    assertType<{ test: { test: string } }>(state)
  })
})

test('transact path argument supports nested fields', async () => {
  const db = new JsonDB({ field: 5, field2: 's', field3: { test: 't', test2: [{ n: 1 }, { n: 2 }] } })
  db.transact({
    test: ['field3'],
    test2: ['field3', 'test'],
    test3: ['field3', 'test2'],
    test4: ['field3', 'test2', 0],
    test5: ['field3', 'test2', 0, 'n'],
  } as const)(state => {
    assertType<{
      test: { test: string; test2: { n: number }[] }
      test2: string
      test3: { n: number }[]
      test4: { n: number } | undefined
      test5: number | undefined
    }>(state)
  })
})

test('get returns the type of an object created from db state paths', () => {
  const db = new JsonDB({ field: 5, field2: 's', field3: { test: 't', test2: [{ n: 1 }, { n: 2 }] } })
  const value = db.get({ test: ['field'] } as const)
  assertType<{ test: number }>(value)
  const value2 = db.get({
    test: ['field3'],
    test2: ['field3', 'test'],
    test3: ['field3', 'test2'],
    test4: ['field3', 'test2', 0],
    test5: ['field3', 'test2', 0, 'n'],
  } as const)
  assertType<{
    test: { test: string; test2: { n: number }[] }
    test2: string
    test3: { n: number }[]
    test4: { n: number } | undefined
    test5: number | undefined
  }>(value2)
})
