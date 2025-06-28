export function exportDataToCsv({ data, fields, filename, fileExtension, includeHeaders, }: {
    data: any[];
    fields: any[];
    filename: string;
    fileExtension?: string | undefined;
    includeHeaders?: boolean | undefined;
}): void;
export function importCsvData(file: File, options?: {
    header?: boolean | undefined;
    delimiter?: string | undefined;
    transform?: Function | undefined;
    validate?: Function | undefined;
}): Promise<Object>;
export function validateCsvFile(file: File, options?: {
    maxSize?: number | undefined;
    allowedExtensions?: any[] | undefined;
}): Object;
declare namespace _default {
    export { exportDataToCsv };
    export { importCsvData };
    export { validateCsvFile };
}
export default _default;
//# sourceMappingURL=csv.d.ts.map