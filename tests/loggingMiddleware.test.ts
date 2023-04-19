import JsonDB from '../src'
import loggingMiddleware from '../src/middlewares/loggingMiddleware'

test('calling methods of db calls logOutputFn', () => {
  const logOutputFnSpy = vi.fn()
  const db = new JsonDB(
    { field: 5 },
    {
      middleware: loggingMiddleware({
        logOutputFn: logOutputFnSpy,
        diffColor: false,
      }),
    }
  )
  db.transact({ test: ['field'] })(state => {
    state.test = 10
  })
  expect(logOutputFnSpy).toHaveBeenCalledTimes(1)
  expect(logOutputFnSpy).toHaveBeenCalledWith(
    expect.objectContaining({
      stateBefore: { field: 5 },
      stateAfter: { field: 10 },
      message: `afterTransact: {"test":["field"]}
 {
-  field: 5
+  field: 10
 }
`,
    })
  )
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
  db.exportState()
  await db.exportStateAsync()
  db.get({})
  await db.getAsync({})

  expect(logOutputFnSpy).toHaveBeenCalledTimes(12)
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
  db.exportState()
  await db.exportStateAsync()

  expect(logOutputFnSpy).toHaveBeenCalledTimes(6) // without beforeMigrate, beforeMigrateAsync, beforeTransact, beforeTransactAsync
})

test('logOutputFn in afterTransact receives correct stateBefore', async () => {
  const logOutputFnSpy = vi.fn()
  const db = await new JsonDB(
    { field: 5 },
    {
      middleware: loggingMiddleware({
        logOutputFn: logOutputFnSpy,
      }),
    }
  )

  db.transact({ test: ['field'] })(state => {
    state.test = 10
  })

  expect(logOutputFnSpy).toHaveBeenCalledWith(
    expect.objectContaining({ stateBefore: { field: 5 }, stateAfter: { field: 10 } })
  )
})

test('diff = false disables diff printing', () => {
  const logOutputFnSpy = vi.fn()
  const db = new JsonDB(
    { field: 5 },
    {
      middleware: loggingMiddleware({
        logOutputFn: logOutputFnSpy,
        diff: false,
      }),
    }
  )
  db.transact({ test: ['field'] })(state => {
    state.test = 10
  })
  expect(logOutputFnSpy).toHaveBeenCalledTimes(1)
  expect(logOutputFnSpy).toHaveBeenCalledWith(
    expect.objectContaining({
      stateBefore: { field: 5 },
      stateAfter: { field: 10 },
      message: `afterTransact: {"test":["field"]}`,
    })
  )
})

test('logMigrate, logTransact, logExportState = false disable logging of these methods', async () => {
  const logOutputFnSpy = vi.fn()
  const db = await new JsonDB(
    { field: 5 },
    {
      middleware: loggingMiddleware({
        logOutputFn: logOutputFnSpy,
        logTransact: false,
        logMigrate: false,
        logExportState: false,
        logGet: false,
      }),
    }
  )
    .migrate('sync migration', state => state)
    .migrateAsync('async migration', async state => state)
  db.transact({})(() => {})
  await db.transactAsync({})(async () => {})
  db.exportState()
  await db.exportStateAsync()
  db.get({})
  await db.getAsync({})

  expect(logOutputFnSpy).toHaveBeenCalledTimes(0)
})
