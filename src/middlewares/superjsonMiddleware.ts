import { JsonDBMiddleware } from '..'
import superjson from 'superjson'

export default function superjsonMiddleware<Schema>(): JsonDBMiddleware<Schema> {
  const beforeFn = ({ stateBefore: { __superjsonMeta, ...stateBefore } }: any) => {
    return superjson.deserialize({ json: stateBefore, meta: __superjsonMeta || {} })
  }

  const beforeFnAsync = async ({ stateBefore: { __superjsonMeta, ...stateBefore } }: any) => {
    return superjson.deserialize({ json: stateBefore, meta: __superjsonMeta || {} })
  }

  const afterFn = ({ stateAfter }: any) => {
    const { json, meta } = superjson.serialize(stateAfter)
    return { ...(json as any), __superjsonMeta: meta } as any
  }

  const afterFnAsync = async ({ stateAfter }: any) => {
    const { json, meta } = superjson.serialize(stateAfter)
    return { ...(json as any), __superjsonMeta: meta } as any
  }

  return {
    beforeTransact: beforeFn,
    afterTransact: afterFn,
    beforeTransactAsync: beforeFnAsync,
    afterTransactAsync: afterFnAsync,
    beforeMigrate: beforeFn,
    afterMigrate: afterFn,
    beforeMigrateAsync: beforeFnAsync,
    afterMigrateAsync: afterFnAsync,
    get: beforeFn,
    getAsync: beforeFnAsync,
  } as any
}
