export default interface Schema {
  stringField: string
  numberField: number
  nestedSchema?: Schema
  arrayOfSchemas: Schema[]
}
