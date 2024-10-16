import { FKey } from './types';
declare class Db {
    private db;
    private _schemas;
    static readonly TYPES_SCHEMA = "psql_to_ts";
    static readonly TYPES_TABLE = "custom";
    constructor(conn: string);
    findTypes(): Promise<Record<string, Record<string, {
        desc?: string | undefined;
        values: string[];
    }>>>;
    init(): Promise<void>;
    findCustoms(): Promise<never[] | {
        name: string;
        value: string;
    }[]>;
    findTables(): Promise<Record<string, Record<string, Pick<{
        name: string;
        columns: {
            name: string;
            type: string;
            schema: string;
            nullable: boolean;
            desc?: string;
        }[];
        schema: string;
        desc?: string | undefined;
    }, "columns" | "desc">>>>;
    findFKeys(): Promise<{
        [schema: string]: {
            [table: string]: {
                [column: string]: FKey;
            };
        };
    }>;
    set schemas(value: string[]);
    private get schemaProp();
}
export default Db;
