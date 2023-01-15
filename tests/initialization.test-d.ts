import JsonDB from '../src'

test('isAsyncOnly = true prevents usage of sync methods', () => {
  const db = new JsonDB({ field: 5 }, { isAsyncOnly: true })
  expectTypeOf(db.transact).toBeNever()
  expectTypeOf(db.exportState).toBeNever()
  expectTypeOf(db.migrate).toBeNever()
  expectTypeOf(db.transactAsync).toBeFunction()
  expectTypeOf(db.exportStateAsync).toBeFunction()
  expectTypeOf(db.migrateAsync).toBeFunction()
})

test('isAsyncOnly = false allows usage of sync methods', () => {
  const db = new JsonDB({ field: 5 }, { isAsyncOnly: false })
  expectTypeOf(db.transact).toBeFunction()
  expectTypeOf(db.exportState).toBeFunction()
  expectTypeOf(db.migrate).toBeFunction()
  expectTypeOf(db.transactAsync).toBeFunction()
  expectTypeOf(db.exportStateAsync).toBeFunction()
  expectTypeOf(db.migrateAsync).toBeFunction()
})

test('sync methods are available by default', () => {
  const db = new JsonDB({ field: 5 })
  expectTypeOf(db.transact).toBeFunction()
  expectTypeOf(db.exportState).toBeFunction()
  expectTypeOf(db.migrate).toBeFunction()
  expectTypeOf(db.transactAsync).toBeFunction()
  expectTypeOf(db.exportStateAsync).toBeFunction()
  expectTypeOf(db.migrateAsync).toBeFunction()
})
