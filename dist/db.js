"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pg_promise_1 = __importDefault(require("pg-promise"));
class Db {
    db;
    _schemas = [];
    static TYPES_SCHEMA = 'psql_to_ts';
    static TYPES_TABLE = 'custom';
    constructor(conn) {
        this.db = (0, pg_promise_1.default)({})(conn);
    }
    async findTypes() {
        const schemas = {};
        await this.db.each(`
          select n.nspname as schema, t.typname as "type", json_agg(e.enumlabel) as value, obj_description(t.oid) as "desc"
          from pg_type t
                   join pg_enum e on t.oid = e.enumtypid
                   join pg_catalog.pg_namespace n ON n.oid = t.typnamespace AND ($[schemas] IS NULL OR n.nspname = ANY ($[schemas]))
          group by n.nspname, t.typname, t.oid
          order by t.typname;`, this.schemaProp, (item) => {
            schemas[item.schema] ??= {};
            schemas[item.schema][item.type] ??= {
                values: (item.value ?? []).sort((a, b) => a.localeCompare(b)),
                desc: item.desc
            };
        });
        return schemas;
    }
    async init() {
        return this.db.task(async (t) => {
            await t.none(`CREATE SCHEMA $[schema~];`, { schema: Db.TYPES_SCHEMA }).catch(() => { });
            await this.db.none(`
        CREATE TABLE IF NOT EXISTS $[schema~].$[table~] (
          name varchar(255) NOT NULL PRIMARY KEY,
          value text not null
        );
    `, { schema: Db.TYPES_SCHEMA, table: Db.TYPES_TABLE });
        });
    }
    async findCustoms() {
        return this.db
            .any(`SELECT * FROM ${Db.TYPES_SCHEMA}.${Db.TYPES_TABLE}`)
            .catch((_e) => []);
    }
    async findTables() {
        const schemas = {};
        await this.db.each(`
        SELECT c.table_name AS name,
          c.table_schema AS schema,
          JSON_AGG(JSON_BUILD_OBJECT(
            'name', c.column_name,
            'type', c.udt_name,
            'schema', c.udt_schema,
            'nullable', c.is_nullable = 'YES',
            'desc', pgd.description
                   )) AS columns,
          OBJ_DESCRIPTION((c.table_schema || '.' || c.table_name)::regclass) AS "desc"
          FROM pg_catalog.pg_statio_all_tables AS st
          LEFT JOIN pg_catalog.pg_description pgd ON (pgd.objoid = st.relid)
          RIGHT JOIN information_schema.columns c ON (
            pgd.objsubid = c.ordinal_position AND
              c.table_schema = st.schemaname AND
              c.table_name = st.relname
              AND ($[schemas] IS NULL OR c.table_schema = ANY ($[schemas]))
            )
          GROUP BY table_schema, table_name`, this.schemaProp, (item) => {
            schemas[item.schema] ??= {};
            schemas[item.schema][item.name] = { columns: item.columns, desc: item.desc };
        });
        return schemas;
    }
    async findFKeys() {
        const schemas = {};
        await this.db.each(`
    SELECT
  o.conname AS "constraint",
  fn.nspname AS source_schema,
  m.relname AS source_table,
  (SELECT a.attname FROM pg_attribute a WHERE a.attrelid = m.oid AND a.attnum = o.conkey[1] AND a.attisdropped = false) AS source_column,
  mn.nspname AS target_schema,
  f.relname AS target_table,
  (SELECT a.attname FROM pg_attribute a WHERE a.attrelid = f.oid AND a.attnum = o.confkey[1] AND a.attisdropped = false) AS target_column
  FROM
    pg_constraint o LEFT JOIN pg_class f ON f.oid = o.confrelid LEFT JOIN pg_class m ON m.oid = o.conrelid
  join pg_namespace fn on f.relnamespace = fn.oid
  join pg_namespace mn ON m.relnamespace = mn.oid
  WHERE
    o.contype = 'f' AND o.conrelid IN (SELECT oid FROM pg_class c WHERE c.relkind = 'r')
    AND ($[schemas] IS NULL OR (fn.nspname = ANY ($[schemas]) AND mn.nspname = ANY($[schemas])))
    `, this.schemaProp, (row) => {
            schemas[row.source_schema] ??= {};
            schemas[row.source_schema][row.source_table] ??= {};
            schemas[row.source_schema][row.source_table][row.source_column] = {
                constraint: row.constraint,
                table: row.target_table,
                schema: row.target_schema,
                column: row.target_column
            };
        });
        return schemas;
    }
    set schemas(value) {
        this._schemas = value;
    }
    get schemaProp() {
        return { schemas: this._schemas.length > 0 ? this._schemas : null };
    }
}
exports.default = Db;
//# sourceMappingURL=db.js.map