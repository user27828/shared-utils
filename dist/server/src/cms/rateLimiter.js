// ─── Defaults ─────────────────────────────────────────────────────────────
const DEFAULT_ADMIN_READ = {
    maxRequests: 240,
    windowMs: 60_000,
};
const DEFAULT_ADMIN_WRITE = {
    maxRequests: 30,
    windowMs: 60_000,
};
const DEFAULT_PUBLIC_READ = {
    maxRequests: 120,
    windowMs: 60_000,
};
const DEFAULT_PUBLIC_WRITE = {
    maxRequests: 60,
    windowMs: 60_000,
};
const DEFAULT_PUBLIC_UNLOCK = {
    maxRequests: 10,
    windowMs: 60_000,
};
// ─── Default user key resolver ────────────────────────────────────────────
const defaultGetUserKey = (req) => {
    const anyReq = req;
    const candidates = [
        anyReq?.user?.profile?.uid,
        anyReq?.user?.auth?.id,
        anyReq?.user?.uid,
        anyReq?.user?.id,
    ];
    const asString = candidates
        .map((c) => (typeof c === "string" ? c.trim() : ""))
        .find((s) => Boolean(s));
    return asString ? `u:${asString}` : `ip:${req.ip}`;
};
// ─── Rate limiter class ───────────────────────────────────────────────────
export class CmsRateLimiter {
    redis = null;
    memoryStore = new Map();
    cleanupInterval = null;
    initialized = false;
    redisUrl;
    constructor(redisUrl) {
        this.redisUrl = redisUrl;
        this.startMemoryCleanup();
    }
    startMemoryCleanup() {
        this.cleanupInterval = setInterval(() => {
            const now = Date.now();
            for (const [key, value] of this.memoryStore.entries()) {
                if (now > value.resetTime) {
                    this.memoryStore.delete(key);
                }
            }
        }, 60_000);
    }
    async ensureInitialized() {
        if (this.initialized) {
            return;
        }
        this.initialized = true;
        if (!this.redisUrl) {
            return;
        }
        try {
            const Redis = (await import("ioredis")).default;
            this.redis = new Redis(this.redisUrl, {
                maxRetriesPerRequest: 1,
                enableOfflineQueue: false,
                connectTimeout: 2000,
            });
            this.redis.on("error", () => {
                // Fail quietly; fall back to memory.
            });
            await this.redis.ping();
        }
        catch {
            this.redis = null;
        }
    }
    async checkLimit(key, rule) {
        await this.ensureInitialized();
        const now = Date.now();
        const resetTime = now + rule.windowMs;
        if (this.redis) {
            try {
                const windowId = Math.floor(now / rule.windowMs);
                const redisKey = `${key}:${windowId}`;
                const multi = this.redis.multi();
                multi.incr(redisKey);
                multi.pexpire(redisKey, rule.windowMs);
                const res = await multi.exec();
                const count = Number(res?.[0]?.[1] ?? 0);
                if (count <= rule.maxRequests) {
                    return {
                        allowed: true,
                        remaining: Math.max(0, rule.maxRequests - count),
                        resetTime,
                    };
                }
                return { allowed: false, remaining: 0, resetTime };
            }
            catch {
                // fall back to memory
            }
        }
        const entry = this.memoryStore.get(key);
        if (!entry || now > entry.resetTime) {
            this.memoryStore.set(key, { count: 1, resetTime });
            return { allowed: true, remaining: rule.maxRequests - 1, resetTime };
        }
        if (entry.count < rule.maxRequests) {
            entry.count++;
            return {
                allowed: true,
                remaining: Math.max(0, rule.maxRequests - entry.count),
                resetTime: entry.resetTime,
            };
        }
        return { allowed: false, remaining: 0, resetTime: entry.resetTime };
    }
    cleanup() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        if (this.redis) {
            this.redis.disconnect();
        }
    }
}
// ─── Response header helper ───────────────────────────────────────────────
const setRateLimitHeaders = (res, rule, result) => {
    res.setHeader("X-RateLimit-Limit", String(rule.maxRequests));
    res.setHeader("X-RateLimit-Remaining", String(result.remaining));
    res.setHeader("X-RateLimit-Reset", String(Math.ceil(result.resetTime / 1000)));
};
// ─── Middleware factories ─────────────────────────────────────────────────
/**
 * Create CMS admin rate limit middleware.
 */
export const createCmsAdminRateLimitMiddleware = (config) => {
    const limiter = new CmsRateLimiter(config.redisUrl);
    const readRule = config.adminRules?.read ?? DEFAULT_ADMIN_READ;
    const writeRule = config.adminRules?.write ?? DEFAULT_ADMIN_WRITE;
    const getUserKey = config.getUserKey ?? defaultGetUserKey;
    // Cleanup on process exit
    const cleanup = () => limiter.cleanup();
    process.on("SIGTERM", cleanup);
    process.on("SIGINT", cleanup);
    return async (req, res, next) => {
        const m = (req.method || "GET").toUpperCase();
        const rule = m === "GET" || m === "HEAD" ? readRule : writeRule;
        const key = `cms-admin:${getUserKey(req)}:${req.method}:${req.path}`;
        const result = await limiter.checkLimit(key, rule);
        setRateLimitHeaders(res, rule, result);
        if (!result.allowed) {
            res.status(429).json({ success: false, message: "Rate limit exceeded" });
            return;
        }
        next();
    };
};
/**
 * Create CMS public rate limit middleware.
 */
export const createCmsPublicRateLimitMiddleware = (config) => {
    const limiter = new CmsRateLimiter(config.redisUrl);
    const readRule = config.publicRules?.read ?? DEFAULT_PUBLIC_READ;
    const writeRule = config.publicRules?.write ?? DEFAULT_PUBLIC_WRITE;
    const unlockRule = config.publicRules?.unlock ?? DEFAULT_PUBLIC_UNLOCK;
    const cleanup = () => limiter.cleanup();
    process.on("SIGTERM", cleanup);
    process.on("SIGINT", cleanup);
    return async (req, res, next) => {
        const m = (req.method || "GET").toUpperCase();
        const p = req.path || "";
        const isUnlock = m === "POST" && p.endsWith("/unlock");
        let rule;
        if (isUnlock) {
            rule = unlockRule;
        }
        else if (m === "GET" || m === "HEAD") {
            rule = readRule;
        }
        else {
            rule = writeRule;
        }
        let keyBase = `cms-public:ip:${req.ip}:${req.method}:${req.path}`;
        if (isUnlock) {
            const parts = p.split("/").filter(Boolean);
            const postType = parts[0] || "";
            const locale = parts[1] || "";
            const slug = parts[2] || "";
            keyBase = `cms-public-unlock:ip:${req.ip}:pt:${postType}:loc:${locale}:slug:${slug}`;
        }
        const result = await limiter.checkLimit(keyBase, rule);
        setRateLimitHeaders(res, rule, result);
        if (!result.allowed) {
            res.status(429).json({ success: false, message: "Rate limit exceeded" });
            return;
        }
        next();
    };
};
//# sourceMappingURL=rateLimiter.js.map