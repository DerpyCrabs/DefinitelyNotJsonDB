import superjson from 'superjson'

export type Paths = { [key: string]: string }

export function getViewFromPath(state: any, path: (string | number)[]): any {
  let fieldPointer = state
  path.forEach(field => {
    fieldPointer = fieldPointer[field]
  })
  return fieldPointer
}

export function actionStateFromPaths(state: any, paths: Paths): any {
  return Object.fromEntries(
    Object.entries(paths).map(([fieldName, path]) => [fieldName, getViewFromPath(state, splitPath(path))])
  )
}

export function setStateFromActionState(paths: Paths, actionState: { [key: string]: any }, currentState: any) {
  Object.entries(paths).forEach(([fieldName, path]) => {
    let fieldPointer = currentState
    const pathFields = splitPath(path)
    pathFields.slice(0, pathFields.length - 1).forEach(field => {
      fieldPointer = fieldPointer[field]
    })
    fieldPointer[pathFields[pathFields.length - 1]] = actionState[fieldName]
  })
}

export function splitPath(path: string): (number | string)[] {
  return path.split('.').map(p => (/^\d+$/.test(p) ? Number.parseInt(p, 10) : p))
}

export function cloneState<Schema>(state: Schema): Schema {
  return superjson.parse(superjson.stringify(state))
}
