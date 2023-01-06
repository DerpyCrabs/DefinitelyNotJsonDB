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
