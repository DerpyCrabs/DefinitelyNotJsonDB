import { JsonDBMiddleware } from '..'
import superjson from 'superjson'

export default function superjsonMiddleware<Schema>(): JsonDBMiddleware<Schema> {
  return {
    beforeTransact({ stateBefore: { __superjsonMeta, ...stateBefore } }: any) {
      return superjson.deserialize({ json: stateBefore, meta: __superjsonMeta || {} })
    },
    afterTransact({ stateAfter }) {
      const { json, meta } = superjson.serialize(stateAfter)
      return { ...(json as any), __superjsonMeta: meta } as any
    },
    async beforeTransactAsync({ stateBefore: { __superjsonMeta, ...stateBefore } }: any) {
      return superjson.deserialize({ json: stateBefore, meta: __superjsonMeta || {} })
    },
    async afterTransactAsync({ stateAfter }) {
      const { json, meta } = superjson.serialize(stateAfter)
      return { ...(json as any), __superjsonMeta: meta } as any
    },
    beforeMigrate({ stateBefore: { __superjsonMeta, ...stateBefore } }: any) {
      return superjson.deserialize({ json: stateBefore, meta: __superjsonMeta || {} })
    },
    afterMigrate({ stateAfter }) {
      const { json, meta } = superjson.serialize(stateAfter)
      return { ...(json as any), __superjsonMeta: meta } as any
    },
    getSnapshot({ stateBefore: { __superjsonMeta, ...stateBefore } }: any) {
      return superjson.deserialize({ json: stateBefore, meta: __superjsonMeta || {} })
    },
  }
}
