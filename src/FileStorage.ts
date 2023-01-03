import fs from 'fs'
import { JsonDBOptions } from '.'
import MemoryStorage from './MemoryStorage'

export default class FileStorage<Schema extends object> extends MemoryStorage<Schema> {
  currentState: Schema
  options: FileStorageOptions
  currentMigrationId: number | undefined

  constructor(initialState: Schema, options: FileStorageOptions, currentMigrationId?: number) {
    super(initialState as Schema, currentMigrationId)
    this.options = options || {}
    if (fs.existsSync(this.options.filePath)) {
      this.currentState = JSON.parse(fs.readFileSync(options.filePath, { encoding: 'utf-8' })) as Schema
    } else {
      this.currentState = initialState
    }
  }

  public transact(paths?: any, options?: JsonDBOptions<Schema>): (action: (state: any) => any) => any {
    return action => {
      const result = super.transact(paths, options)(action)
      fs.writeFileSync(this.options.filePath, JSON.stringify(this.currentState), { encoding: 'utf-8' })
      return result
    }
  }
}

export interface FileStorageOptions {
  filePath: string
}
