import { FKey } from './types';
export declare function toCamelCase(str: string): string;
export declare function getType(column: {
    type: string;
    schema: string;
    nullable: boolean;
    desc?: string;
}, schemas: Record<string, {
    types: Record<string, unknown>;
    tables: Record<string, unknown>;
}>, fKey?: FKey): string;
export declare function sanitizeComment(comment?: string): string;
