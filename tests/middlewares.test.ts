import JsonDB from '../src'

test('middlewares get correct stateBefore', () => {
  const afterTransactSpy = vi.fn()
  afterTransactSpy.mockImplementation(state => state.stateAfter)
  const afterTransactSpy2 = vi.fn()
  afterTransactSpy2.mockImplementation(state => state.stateAfter)
  const db = new JsonDB(
    { field: 5 },
    {
      middleware: [
        { beforeTransact: ({ stateBefore }) => ({ ...stateBefore, field: stateBefore.field + 1 }) },
        { afterTransact: afterTransactSpy },
        { beforeTransact: ({ stateBefore }) => ({ ...stateBefore, field: stateBefore.field + 1 }) },
        { afterTransact: afterTransactSpy2 },
      ],
    }
  )
  db.transact({ test: 'field' })(state => {
    state.test = 10
  })
  expect(afterTransactSpy).toHaveBeenCalledWith(
    expect.objectContaining({
      stateBefore: { field: 6 },
      stateAfter: { field: 10 },
    })
  )
  expect(afterTransactSpy2).toHaveBeenCalledWith(
    expect.objectContaining({
      stateBefore: { field: 7 },
      stateAfter: { field: 10 },
    })
  )
})

test('after* middleware hooks receive same stateBefore as corresponding before* hooks have received', () => {
  const beforeHook = vi.fn()
  const afterHook = vi.fn()
  const db = new JsonDB(
    { field: 5 },
    {
      middleware: [
        { beforeTransact: ({ stateBefore }) => ({ ...stateBefore, field: stateBefore.field + 5 }) },
        {
          beforeTransact: data => {
            beforeHook(data)
            return data.stateBefore
          },
          afterTransact: data => {
            afterHook(data)
            return data.stateAfter
          },
        },
        { beforeTransact: ({ stateBefore }) => ({ ...stateBefore, field: stateBefore.field + 5 }) },
      ],
    }
  )
  db.transact({})(() => {})

  expect(beforeHook).toHaveBeenCalledWith(expect.objectContaining({ stateBefore: { field: 10 } }))
  expect(afterHook).toHaveBeenCalledWith(
    expect.objectContaining({ stateBefore: { field: 10 }, stateAfter: { field: 15 } })
  )
})
