import JsonDB from '../src'

test('getSnapshot returns currentState', () => {
  const db = new JsonDB({ field: 5 })
  db.transact({ test: 'field' })(state => {
    state.test = 10
  })
  expect(db.getSnapshot()).toStrictEqual({ field: 10 })
  db.transact({ test: 'field' })(state => {
    state.test = 15
  })
  expect(db.getSnapshot()).toStrictEqual({ field: 15 })
})

test('getSnapshot async returns currentState', async () => {
  const db = new JsonDB({ field: 5 })
  await db.transactAsync({ test: 'field' })(async state => {
    state.test = 10
  })
  expect(await db.getSnapshotAsync()).toStrictEqual({ field: 10 })
  db.transact({ test: 'field' })(state => {
    state.test = 15
  })
  expect(await db.getSnapshotAsync()).toStrictEqual({ field: 15 })
})

test("async transactions don't override each other", async () => {
  const db = new JsonDB({ field: 5 })

  db.transactAsync({ test: 'field' })(async state => {
    return new Promise(r => {
      state.test = state.test + 1
      r({})
    })
  })
  await db.transactAsync({ test: 'field' })(async state => {
    return new Promise(r => {
      state.test = state.test + 2
      setTimeout(() => r({}), 100)
    })
  })
  expect(await db.getSnapshotAsync()).toStrictEqual({ field: 8 })
})
