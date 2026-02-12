/**
 * CMS Rate Limiter — shared-utils
 *
 * Generic sliding-window rate limiter with Redis primary and
 * in-memory fallback. Provides Express middleware factories for
 * CMS admin and public endpoints.
 */
import type { NextFunction, Request, Response } from "express";
export interface CmsRateLimitRule {
    maxRequests: number;
    windowMs: number;
}
export interface CmsRateLimitCheckResult {
    allowed: boolean;
    remaining: number;
    resetTime: number;
}
export interface CmsRateLimiterConfig {
    /** Optional Redis URL. If not provided, uses in-memory store only. */
    redisUrl?: string;
    /** Admin rate limit rules. */
    adminRules?: {
        read?: CmsRateLimitRule;
        write?: CmsRateLimitRule;
    };
    /** Public rate limit rules. */
    publicRules?: {
        read?: CmsRateLimitRule;
        write?: CmsRateLimitRule;
        unlock?: CmsRateLimitRule;
    };
    /** Optional function to resolve a user key from a request. */
    getUserKey?: (req: Request) => string;
}
export declare class CmsRateLimiter {
    private redis;
    private memoryStore;
    private cleanupInterval;
    private initialized;
    private redisUrl;
    constructor(redisUrl?: string);
    private startMemoryCleanup;
    private ensureInitialized;
    checkLimit(key: string, rule: CmsRateLimitRule): Promise<CmsRateLimitCheckResult>;
    cleanup(): void;
}
/**
 * Create CMS admin rate limit middleware.
 */
export declare const createCmsAdminRateLimitMiddleware: (config: CmsRateLimiterConfig) => ((req: Request, res: Response, next: NextFunction) => Promise<void>);
/**
 * Create CMS public rate limit middleware.
 */
export declare const createCmsPublicRateLimitMiddleware: (config: CmsRateLimiterConfig) => ((req: Request, res: Response, next: NextFunction) => Promise<void>);
//# sourceMappingURL=rateLimiter.d.ts.map