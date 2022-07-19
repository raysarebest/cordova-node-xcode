export = pbxWriter;
declare function pbxWriter(contents: any, options: any): void;
declare class pbxWriter {
    constructor(contents: any, options: any);
    contents: any;
    sync: boolean;
    indentLevel: number;
    omitEmptyValues: any;
    write(str: any, ...args: any[]): void;
    writeFlush(str: any, ...args: any[]): void;
    writeSync(): string;
    buffer: string;
    writeHeadComment(): void;
    writeProject(): void;
    writeObject(object: any): void;
    writeObjectsSections(objects: any): void;
    writeArray(arr: any, name: any): void;
    writeSectionComment(name: any, begin: any): void;
    writeSection(section: any): void;
    writeInlineObject(n: any, d: any, r: any): void;
}
//# sourceMappingURL=pbxWriter.d.ts.map