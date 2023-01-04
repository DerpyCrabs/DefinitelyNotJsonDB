import { JsonDBMiddleware } from '..'
import superjson from 'superjson'

export default function superjsonMiddleware<Schema>(): JsonDBMiddleware<Schema> {
  const beforeFn: JsonDBMiddleware<Schema>['beforeMigrate'] = ({
    stateBefore: { __superjsonMeta, ...stateBefore },
  }) => {
    return superjson.deserialize({ json: stateBefore, meta: __superjsonMeta || {} })
  }

  const beforeFnAsync: JsonDBMiddleware<Schema>['beforeMigrateAsync'] = async ({
    stateBefore: { __superjsonMeta, ...stateBefore },
  }) => {
    return superjson.deserialize({ json: stateBefore, meta: __superjsonMeta || {} })
  }

  const afterFn: JsonDBMiddleware<Schema>['afterMigrate'] = ({ stateAfter }) => {
    const { json, meta } = superjson.serialize(stateAfter)
    return { ...(json as any), __superjsonMeta: meta } as any
  }

  const afterFnAsync: JsonDBMiddleware<Schema>['afterMigrateAsync'] = async ({ stateAfter }) => {
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
    getSnapshot: beforeFn,
    getSnapshotAsync: beforeFnAsync,
  }
}
