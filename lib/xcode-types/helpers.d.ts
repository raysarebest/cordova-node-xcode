/**
 * Wraps a string literal type in double quotes (`"`) if it isn't already. If it is already wrapped in double quotes (for example, `'"example"'`), it will not be modified
 */
export declare type Quoted<Literal extends string> = Literal extends `"${infer Content}"` ? Literal : `"${Literal}"`;
/**
 * Removes double quotes (`"`) that wrap a string literal type. A double quote will need to be both the first and last character of the literal for either of them to be stripped
 */
export declare type Unquoted<Literal extends string> = Literal extends `"${infer Content}"` ? Content : Literal;