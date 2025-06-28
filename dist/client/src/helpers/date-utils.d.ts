export function formatDate(date: Date | string | number, format?: string, options?: Object): string;
export function parseDate(dateString: string, inputFormat?: string): Date | null;
export function addToDate(date: Date | string, amount: number, unit: string): Date | null;
export function dateDifference(date1: Date | string, date2: Date | string, unit?: string): number | null;
export function isValidDate(date: any): boolean;
export function getRelativeTime(date: Date | string, baseDate?: Date | string, options?: Object): string;
export function getTimezoneInfo(timezone?: string): Object;
export function getTimezoneOffset(date: Date, timezone: string): string;
export function isLeapYear(year: number): boolean;
export function getDaysInMonth(year: number, month: number): number;
declare namespace _default {
    export { formatDate };
    export { parseDate };
    export { addToDate };
    export { dateDifference };
    export { isValidDate };
    export { getRelativeTime };
    export { getTimezoneInfo };
    export { getTimezoneOffset };
    export { isLeapYear };
    export { getDaysInMonth };
}
export default _default;
//# sourceMappingURL=date-utils.d.ts.map