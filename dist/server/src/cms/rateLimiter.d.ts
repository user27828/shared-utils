/**
 * CMS Rate Limiter — shared-utils
 *
 * Generic sliding-window rate limiter with Redis primary and
 * in-memory fallback. Provides Express middleware factories for
 * CMS admin and public endpoints.
 */
import type { NextFunction, Request, Response } from "express";
/** The Redis operations used by rate limiting, independent of vendor declarations. */
export interface CmsRedisClient {
    on(event: "error", listener: () => void): unknown;
    ping(): Promise<unknown>;
    multi(): {
        incr(key: string): unknown;
        pexpire(key: string, milliseconds: number): unknown;
        exec(): Promise<unknown>;
    };
    disconnect(): void;
}
export type CmsRedisFactory = (url: string) => CmsRedisClient | Promise<CmsRedisClient>;
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
    /** Required with redisUrl. Import createCmsRedisClient from cms/server/redis. */
    redisFactory?: CmsRedisFactory;
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
    private readonly redisFactory?;
    private redis;
    private memoryStore;
    private cleanupInterval;
    private initialized;
    private initialization;
    private disposed;
    private redisUrl;
    constructor(redisUrl?: string, redisFactory?: CmsRedisFactory | undefined);
    private startMemoryCleanup;
    private ensureInitialized;
    private initializeRedis;
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
