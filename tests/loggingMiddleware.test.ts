import JsonDB from '../src'
import loggingMiddleware from '../src/middlewares/loggingMiddleware'

test('calling methods of db calls logOutputFn', () => {
  const logOutputFnSpy = vi.fn()
  const db = new JsonDB(
    { field: 5 },
    {
      middleware: loggingMiddleware({
        logOutputFn: logOutputFnSpy,
      }),
    }
  )
  db.transact({ test: 'field' })(state => {
    state.test = 10
  })
  expect(logOutputFnSpy).toHaveBeenCalledTimes(1)
  expect(logOutputFnSpy).toHaveBeenCalledWith(expect.objectContaining({ message: 'afterTransact: {"test":"field"}' }))
})

test('logOutputFn is called on every hook', async () => {
  const logOutputFnSpy = vi.fn()
  const db = await new JsonDB(
    { field: 5 },
    {
      middleware: loggingMiddleware({
        logOutputFn: logOutputFnSpy,
        logBeforeAction: true,
      }),
    }
  )
    .migrate('sync migration', state => state)
    .migrateAsync('async migration', async state => state)
  db.transact({})(() => {})
  await db.transactAsync({})(async () => {})
  db.getSnapshot()
  await db.getSnapshotAsync()

  expect(logOutputFnSpy).toHaveBeenCalledTimes(10)
})

test('logOutputFn logBeforeAction = false disables before* hooks', async () => {
  const logOutputFnSpy = vi.fn()
  const db = await new JsonDB(
    { field: 5 },
    {
      middleware: loggingMiddleware({
        logOutputFn: logOutputFnSpy,
        logBeforeAction: false,
      }),
    }
  )
    .migrate('sync migration', state => state)
    .migrateAsync('async migration', async state => state)
  db.transact({})(() => {})
  await db.transactAsync({})(async () => {})
  db.getSnapshot()
  await db.getSnapshotAsync()

  expect(logOutputFnSpy).toHaveBeenCalledTimes(6) // without beforeMigrate, beforeMigrateAsync, beforeTransact, beforeTransactAsync
})
