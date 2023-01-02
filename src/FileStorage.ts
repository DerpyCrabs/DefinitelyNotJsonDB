import fs from 'fs'
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

  public transact(paths?: any): (action: (state: any) => any) => any {
    return action => {
      const result = super.transact(paths)(action)
      fs.writeFileSync(this.options.filePath, JSON.stringify(this.currentState), { encoding: 'utf-8' })
      return result
    }
  }
}

export interface FileStorageOptions {
  filePath: string
}
