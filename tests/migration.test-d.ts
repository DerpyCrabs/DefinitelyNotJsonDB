import { expectAssignable } from 'tsd'
import { DBStorage } from '../src'
import FileStorage from '../src/FileStorage'
import migrateStorage from '../src/migrateStorage'

expectAssignable<DBStorage<{ field2: string }>>(
  migrateStorage(
    [
      {
        id: 1,
        apply: state => ({
          field2: state.toString(),
        }),
      },
    ],
    new FileStorage<{ field: number }>({ field: 5 })
  )
)
