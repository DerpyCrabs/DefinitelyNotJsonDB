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
