# Postgresql-to-TypeScript

This lib lets you export your psql database to a TypeScript namespace.

## Usage

```shell
dist/cli.js -c [connection string] -o [output file path]
dist/cli.js -c [connection string] -o [output file path] -s schema_1 -s schema_2 ...

# to use custom types, run this once :
dist/cli.js -c [connection string] -i
```

## Output
The output file will export a `Db` namespace, containing one namespace by exported schema, each containing all psql types exported as ts types, and all psql tables exported as interfaces.

Schema and tables names are camelCased : `my_schema.my_table` is exported as `Db.MySchema.MyTable`

Columns and types are left untouched

Foreign keys are included:
```ts
export namespace Db {
  export namespace SchemaName {
    export interface TableA {
      id: number
    }
    export interface TableReferencingA {
      // foreign key: `name_of_the_fkey`
      id_a: SchemaName.TableA['id']
    }
  }
}
```

## Custom types
Once you ran the init script:
```shell
dist/cli.js -c [connection string] -i
```
You have access to a new schema `psql_to_ts`, and a table `custom`:

Insert custom types in this table:
```postgresql
INSERT INTO psql_to_ts.custom (name, value) VALUES (
  'myCustomType',
  '{prop: string}'
);
```
and reference them with comments on columns:
```postgresql
COMMENT ON COLUMN my_schema.my_table.my_column IS '@custom {myCustomType}';
```

You can reference other custom types:
```postgresql
INSERT INTO psql_to_ts.custom (name, value) VALUES (
  'mySecondType',
  '{prop: string; custom: myCustomType}'
);
```