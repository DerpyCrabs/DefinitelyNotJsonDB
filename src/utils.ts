export type Paths = { [key: string]: string }

export function splitPath(path: string): (number | string)[] {
  return path
    .split('.')
    .map((p) => (/^\d+$/.test(p) ? Number.parseInt(p, 10) : p))
}
