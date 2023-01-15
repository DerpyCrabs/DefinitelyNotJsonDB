import { existsSync, readFileSync, rmSync } from 'fs'
import JsonDB from '../src'
import filePersistenceMiddleware from '../src/middlewares/filePersistenceMiddleware'

test('migrations are persisted', () => {
  const filePath = 'tests/files/persistence-db.json'
  const db = new JsonDB({ field: 5 }, { middleware: filePersistenceMiddleware(filePath) }).migrate(
    'migration',
    state => ({
      field2: state.field.toString(),
    })
  )
  expect(db.exportState()).toMatchObject({ field2: '5' })
  expect(db.exportState().__migrationHistory.length).toBe(1)
  const fileContents = JSON.parse(readFileSync(filePath, { encoding: 'utf-8' }))
  expect(fileContents).toMatchObject({ field2: '5' })
  expect(fileContents.__migrationHistory.length).toBe(1)
})

afterEach(() => {
  if (existsSync('tests/files/persistence-db.json')) rmSync('tests/files/persistence-db.json')
})
