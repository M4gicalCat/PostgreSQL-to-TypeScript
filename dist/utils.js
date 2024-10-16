"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeComment = exports.getType = exports.toCamelCase = void 0;
function toCamelCase(str) {
    return str
        .split('_')
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join('');
}
exports.toCamelCase = toCamelCase;
function getPsqlType(type) {
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
            return 'string';
        case 'int2':
        case 'int4':
        case 'int8':
        case 'float4':
        case 'float8':
        case 'numeric':
        case 'money':
        case 'oid':
            return 'number';
        case 'bool':
            return 'boolean';
        case 'json':
        case 'jsonb':
            return 'Db.Json';
        case '_int2':
        case '_int4':
        case '_int8':
        case '_float4':
        case '_float8':
        case '_numeric':
        case '_money':
            return 'number[]';
        case '_bool':
            return 'boolean[]';
        case '_varchar':
        case '_text':
        case '_citext':
        case '_uuid':
        case '_bytea':
        case '_char':
            return 'string[]';
        case '_json':
        case '_jsonb':
            return 'Db.Json[]';
        case '_timestamp':
        case '_timestamptz':
            return 'string[]';
        default:
            return 'unknown';
    }
}
function getFkeyType(k) {
    return `${toCamelCase(k.schema)}.${toCamelCase(k.table)}['${k.column}']`;
}
function getType(column, schemas, fKey) {
    if (fKey)
        return getFkeyType(fKey);
    if (column.desc) {
        const [, ...custom] = column.desc.split('@custom ') ?? [];
        if (custom.length) {
            return custom.join('@custom ');
        }
    }
    let type = 'unknown';
    if (column.schema === 'pg_catalog') {
        type = getPsqlType(column.type);
    }
    if (type === 'unknown') {
        type = schemas[column.schema]?.types?.[column.type]
            ? `${toCamelCase(column.schema)}.${column.type}`
            : schemas[column.schema]?.tables?.[column.type]
                ? `${toCamelCase(column.schema)}.${toCamelCase(column.type)}`
                : column.type[0] === '_' && schemas[column.schema]?.types?.[column.type.slice(1)]
                    ? `${toCamelCase(column.schema)}.${column.type.slice(1)}[]`
                    : `unknown /* ${column.schema}.${column.type} */`;
    }
    if (type === 'unknown')
        console.warn(`[UNKNOWN] - ${column.schema}.${column.type}`);
    return column.nullable ? `${type} | null` : type;
}
exports.getType = getType;
function sanitizeComment(comment) {
    return (comment ?? '').split('@custom ')[0].replace(/\//g, '∕').trim();
}
exports.sanitizeComment = sanitizeComment;
//# sourceMappingURL=utils.js.map