import filePersistenceMiddleware from './middlewares/filePersistenceMiddleware'
import superjsonMiddleware from './middlewares/superjsonMiddleware'
import { JsonDB, JsonDBMiddleware } from './JsonDB'
import { AsyncJsonDB, AsyncJsonDBMiddleware } from './AsyncJsonDB'

export default JsonDB

export { filePersistenceMiddleware, superjsonMiddleware, AsyncJsonDB }
export type { AsyncJsonDBMiddleware, JsonDBMiddleware }
