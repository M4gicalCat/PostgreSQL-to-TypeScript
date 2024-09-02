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

You can set custom types for a JSON column :
```postgresql
COMMENT ON COLUMN my_schema.my_table.my_column IS '@custom {customProp: string}';
```

Everything after `@custom ` is used as a type, so make sure you type a correct typescript value

It is not advised, but you can also reference other types, using: `@custom Db.MySchema.MyTable['MyColumn']`.