import { A, L } from 'ts-toolbelt'
// copied from 'ts-toolbelt' because for some reason tsc can't find S.Split in 'ts-toolbelt'

/**
 * @ignore
 */
declare type __Split<
  S extends string,
  D extends string,
  T extends string[] = []
> = S extends `${infer BS}${D}${infer AS}` ? __Split<AS, D, [...T, BS]> : [...T, S]
/**
 * @hidden
 */
declare type _Split<S extends string, D extends string = ''> = D extends '' ? L.Pop<__Split<S, D>> : __Split<S, D>
/**
 * Split `S` by `D` into a [[List]]
 * @param S to split up
 * @param D to split at
 */
export declare type Split<S extends string, D extends string = ''> = _Split<S, D> extends infer X
  ? A.Cast<X, string[]>
  : never
export {}
