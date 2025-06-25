export function exportDataToCsv({ data, fields, filename, fileExtension, includeHeaders, }: {
    data: any[];
    fields: any[];
    filename: string;
    fileExtension?: string | undefined;
    includeHeaders?: boolean | undefined;
}): void;
declare namespace _default {
    export { exportDataToCsv };
}
export default _default;
