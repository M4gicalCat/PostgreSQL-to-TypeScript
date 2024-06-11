export function toCamelCase(str: string) {
  return str
    .split('_')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('')
}

function getPsqlType(type: string) {
  switch (type.toLowerCase()) {
    case 'bpchar':
    case 'char':
    case 'varchar':
    case 'text':
    case 'citext':
    case 'uuid':
    case 'bytea':
    case 'inet':
    case 'time':
    case 'timetz':
    case 'interval':
    case 'name':
    case 'date':
    case 'timestamp':
    case 'timestamptz':
      return 'string'
    case 'int2':
    case 'int4':
    case 'int8':
    case 'float4':
    case 'float8':
    case 'numeric':
    case 'money':
    case 'oid':
      return 'number'
    case 'bool':
      return 'boolean'
    case 'json':
    case 'jsonb':
      //todo
      return 'Db.Json'
    case '_int2':
    case '_int4':
    case '_int8':
    case '_float4':
    case '_float8':
    case '_numeric':
    case '_money':
      return 'number[]'
    case '_bool':
      return 'boolean[]'
    case '_varchar':
    case '_text':
    case '_citext':
    case '_uuid':
    case '_bytea':
    case '_char':
      return 'string[]'
    case '_json':
    case '_jsonb':
      return 'Db.Json[]'
    case '_timestamp':
    case '_timestamptz':
      return 'string[]'
    default:
      return 'unknown'
  }
}

export function getType(
  column: { type: string; schema: string; nullable: boolean },
  schemas: Record<string, { types: Record<string, unknown>; tables: Record<string, unknown> }>
) {
  let type: string = 'unknown'
  if (column.schema === 'pg_catalog') {
    type = getPsqlType(column.type)
  }
  if (type === 'unknown') {
    type = schemas[column.schema]?.types?.[column.type]
      ? `${toCamelCase(column.schema)}.${column.type}`
      : schemas[column.schema]?.tables?.[column.type]
        ? `${toCamelCase(column.schema)}.${toCamelCase(column.type)}`
        : column.type[0] === '_' && schemas[column.schema]?.types?.[column.type.slice(1)]
          ? `${toCamelCase(column.schema)}.${column.type.slice(1)}[]`
          : `unknown /* ${column.schema}.${column.type} */`
  }
  if (type === 'unknown') console.warn(`[UNKNOWN] - ${column.schema}.${column.type}`)
  return column.nullable ? `${type} | null` : type
}

export function sanitizeComment(comment?: string) {
  return (comment ?? '').replace(/\//g, '∕')
}
