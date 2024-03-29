import JsonDB from '../src'

test('exportState returns currentState', () => {
  const db = new JsonDB({ field: 5 })
  db.transact({ test: ['field'] })(state => {
    state.test = 10
  })
  expect(db.exportState()).toStrictEqual({ field: 10 })
  db.transact({ test: ['field'] })(state => {
    state.test = 15
  })
  assertType<{ field: number }>(db.exportState())
  expect(db.exportState()).toStrictEqual({ field: 15 })
})

test('exportState async returns currentState', async () => {
  const db = new JsonDB({ field: 5 })
  await db.transactAsync({ test: ['field'] })(async state => {
    state.test = 10
  })
  expect(await db.exportStateAsync()).toStrictEqual({ field: 10 })
  db.transact({ test: ['field'] })(state => {
    state.test = 15
  })
  assertType<Promise<{ field: number }>>(db.exportStateAsync())
  expect(await db.exportStateAsync()).toStrictEqual({ field: 15 })
})

test("async transactions don't override each other", async () => {
  const db = new JsonDB({ field: 5 })

  db.transactAsync({ test: ['field'] })(async state => {
    return new Promise(r => {
      state.test = state.test + 1
      r({})
    })
  })
  await db.transactAsync({ test: ['field'] })(async state => {
    return new Promise(r => {
      state.test = state.test + 2
      setTimeout(() => r({}), 100)
    })
  })
  expect(await db.exportStateAsync()).toStrictEqual({ field: 8 })
})

test('transact path argument supports nested fields', async () => {
  const db = new JsonDB({ field: 5, field2: 's', field3: { test: 't', test2: [{ n: 1 }, { n: 2 }] } })
  db.transact({
    test: ['field3'],
    test2: ['field3', 'test'],
    test3: ['field3', 'test2'],
    test4: ['field3', 'test2', 0],
    test5: ['field3', 'test2', 0, 'n'],
  })(state => {
    expect(state.test).toStrictEqual({ test: 't', test2: [{ n: 1 }, { n: 2 }] })
    expect(state.test2).toStrictEqual('t')
    expect(state.test3).toStrictEqual([{ n: 1 }, { n: 2 }])
    expect(state.test4).toStrictEqual({ n: 1 })
    expect(state.test5).toStrictEqual(1)
  })
})

test('transact path argument stops traversal on the first undefined or null', async () => {
  const db = new JsonDB({ field: 5, field2: 's', field3: { test: 't', test2: [{ n: 1 }, {}, null] } })
  db.transact({
    test: ['field3', 'test2', 0, 'n'],
    test2: ['field3', 'test2', 1, 'n'],
    test3: ['field3', 'test2', 2],
    test4: ['field3', 'test2', 2, 'n'],
    test5: ['field3', 'test2', 3],
    test6: ['field3', 'test2', 3, 'n'],
  })(state => {
    expect(state.test).toStrictEqual(1)
    expect(state.test2).toStrictEqual(undefined)
    expect(state.test3).toStrictEqual(null)
    expect(state.test4).toStrictEqual(null)
    expect(state.test5).toStrictEqual(undefined)
    expect(state.test6).toStrictEqual(undefined)
  })
})

test('get path argument supports nested fields', async () => {
  const db = new JsonDB({ field: 5, field2: 's', field3: { test: 't', test2: [{ n: 1 }, { n: 2 }] } })
  const value = db.get({
    test: ['field3'],
    test2: ['field3', 'test'],
    test3: ['field3', 'test2'],
    test4: ['field3', 'test2', 0],
    test5: ['field3', 'test2', 0, 'n'],
  })
  expect(value.test).toStrictEqual({ test: 't', test2: [{ n: 1 }, { n: 2 }] })
  expect(value.test2).toStrictEqual('t')
  expect(value.test3).toStrictEqual([{ n: 1 }, { n: 2 }])
  expect(value.test4).toStrictEqual({ n: 1 })
  expect(value.test5).toStrictEqual(1)
})

test('get path argument stops traversal on the first undefined or null', async () => {
  const db = new JsonDB({ field: 5, field2: 's', field3: { test: 't', test2: [{ n: 1 }, {}, null] } })
  const value = db.get({
    test: ['field3', 'test2', 0, 'n'],
    test2: ['field3', 'test2', 1, 'n'],
    test3: ['field3', 'test2', 2],
    test4: ['field3', 'test2', 2, 'n'],
    test5: ['field3', 'test2', 3],
    test6: ['field3', 'test2', 3, 'n'],
  })
  expect(value.test).toStrictEqual(1)
  expect(value.test2).toStrictEqual(undefined)
  expect(value.test3).toStrictEqual(null)
  expect(value.test4).toStrictEqual(null)
  expect(value.test5).toStrictEqual(undefined)
  expect(value.test6).toStrictEqual(undefined)
})

test('transact can set array members', async () => {
  const db = new JsonDB({ field: 5, field2: 's', field3: { test: 't', test2: [{ n: 1 }, {}, null] } })
  db.transact({
    test: ['field3', 'test2', 0],
    test2: ['field3', 'test2', 1],
    test3: ['field3', 'test2', 2],
  })(state => {
    state.test = { n: 2 }
    state.test2 = { n: 3 }
    state.test3 = { n: 4 }
  })
  expect(db.exportState()).toStrictEqual({
    field: 5,
    field2: 's',
    field3: { test: 't', test2: [{ n: 2 }, { n: 3 }, { n: 4 }] },
  })
})

test('async methods return Promise', async () => {
  const db = new JsonDB({ field: 5 })
  const value = db.transactAsync({})(async () => {
    return 5
  })
  assertType<Promise<number>>(value)
  const snapshot = db.exportStateAsync()
  assertType<Promise<{ field: number }>>(snapshot)
  const getValue = db.getAsync({})
  assertType<Promise<{}>>(getValue)
})

test('supports Record in schema', () => {
  const db = new JsonDB<{ field: Record<number, string> }>({ field: { 3: 'test' } })
  const value = db.get({ test: ['field', 5] }).test
  assertType<string>(value)
  expect(value).toBe(undefined)
  const value2 = db.get({ test: ['field', 3] }).test
  assertType<string>(value2)
  expect(value2).toBe('test')
})

test('supports non const path parts', () => {
  const db = new JsonDB<{ field: Record<number, string> }>({ field: { 3: 'test' } })
  const value = db.get({ test: ['field', 3 as number] }).test
  assertType<string>(value)
  expect(value).toBe('test')
})
