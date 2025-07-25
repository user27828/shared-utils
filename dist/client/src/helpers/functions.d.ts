/**
 * Shared functions
 */
export interface IsDevOptions {
    xCriteria?: (() => boolean) | null;
}
/**
 * Check if the current environment is development
 * @param options.xCriteria - eXtra criteria to check if the environment is development - additional check to default
 */
export declare const isDev: ({ xCriteria }?: IsDevOptions) => boolean;
/**
 * Similar to path.join(), but for URLs - either full, absolute, or relative
 * @param args - The URL parts to join
 * @returns The joined URL
 */
export declare const pathJoinUrl: (...args: any[]) => string;
export interface UrlValidationOptions {
    requireProtocol?: boolean;
    allowQueryParams?: boolean;
    allowFragments?: boolean;
}
/**
 * Validates if a string is a properly formatted URL
 *
 * @param url - The URL to validate
 * @param options - Validation options
 * @param options.requireProtocol - Whether to require http/https protocol (default: false)
 * @param options.allowQueryParams - Whether to allow query parameters (default: true)
 * @param options.allowFragments - Whether to allow URL fragments (default: true)
 * @returns True if the URL is valid, false otherwise
 */
export declare const isValidUrl: (url: string, options?: UrlValidationOptions) => boolean;
/**
 * Format date to YYYY/MM/DD
 * @param dateString - The date string to format (parsable by Date constructor)
 * @returns Formatted date string in YYYY/MM/DD format or "N/A" if invalid
 */
export declare const formatDateYYMMDD: (dateString: string) => string;
//# sourceMappingURL=functions.d.ts.map