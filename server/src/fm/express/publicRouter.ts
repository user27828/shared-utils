/**
 * FM Public Router Factory — shared-utils/server/src/fm/express
 *
 * Provides the canonical `/media/:uid` public GET endpoint with:
 *  - Variant-aware resolution (?variant=thumb|preview|web, ?w= for responsive)
 *  - Content-type detection from metadata
 *  - Cache headers (ETag + Cache-Control)
 *  - Redirect vs stream decision (S3: redirect to signed URL; local: sendFile)
 *  - Built-in in-memory LRU redirect cache (configurable TTL/size)
 *  - Variant fallback: if requested variant is missing, serve original
 *
 * Mount example:
 *   app.use("/media",
 *     fmMediaRateLimitMiddleware,
 *     createFmPublicRouter({
 *       service,
 *       cacheControl: "public, max-age=86400, immutable",
 *       cache: { maxEntries: 5000, ttlMs: 60_000 },
 *     }),
 *   );
 */
import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import fs from "fs";

import type { FmServiceCore } from "../FmServiceCore.js";
import {
  isFmError,
  sendFmError,
  FmNotFoundError,
} from "../../../../utils/src/fm/errors.js";
import { getSingleParam } from "../../express/params.js";

// ─── Types ────────────────────────────────────────────────────────────────

/** Configuration for the redirect cache used by the public router. */
export interface FmPublicRouterCacheConfig {
  /** Maximum number of cached redirect entries. Default: 5000. */
  maxEntries?: number;
  /** TTL for cached entries in milliseconds. Default: 60000 (60 seconds). */
  ttlMs?: number;
  /** Enable/disable the redirect cache. Default: true. */
  enabled?: boolean;
}

/** Configuration for {@link createFmPublicRouter}. */
export interface CreateFmPublicRouterConfig {
  /** FmServiceCore instance. */
  service: FmServiceCore;

  /**
   * Cache-Control header for public content.
   * Default: "public, max-age=86400, immutable"
   */
  cacheControl?: string;

  /**
   * Auto-degrade missing variant to original file.
   * Default: true
   */
  enableVariantFallback?: boolean;

  /** Redirect cache configuration for S3 signed URLs. */
  cache?: FmPublicRouterCacheConfig;
}

// ─── RedirectCache ────────────────────────────────────────────────────────

/**
 * Simple TTL-based cache map for S3 signed URL redirects.
 *
 * Uses insertion-order-based eviction (Map preserves insertion order).
 * When capacity is reached, the oldest entry is evicted. Expired entries
 * are lazily evicted on access.
 *
 * Design goals:
 *  - Zero external dependencies
 *  - No timers or background threads (lazy eviction only)
 *  - O(1) get/set
 */
class RedirectCache {
  private map = new Map<string, { url: string; expiresAt: number }>();
  private readonly maxEntries: number;
  private readonly ttlMs: number;

  constructor(config: FmPublicRouterCacheConfig = {}) {
    this.maxEntries = config.maxEntries ?? 5000;
    this.ttlMs = config.ttlMs ?? 60_000;
  }

  get(key: string): string | undefined {
    const entry = this.map.get(key);
    if (!entry) {
      return undefined;
    }
    if (Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return undefined;
    }
    return entry.url;
  }

  set(key: string, url: string): void {
    // Evict oldest if at capacity
    if (this.map.size >= this.maxEntries) {
      const firstKey = this.map.keys().next().value;
      if (firstKey !== undefined) {
        this.map.delete(firstKey);
      }
    }
    this.map.set(key, { url, expiresAt: Date.now() + this.ttlMs });
  }

  /** Number of entries currently in the cache. */
  get size(): number {
    return this.map.size;
  }

  /** Clear all cached entries. */
  clear(): void {
    this.map.clear();
  }
}

// ─── Variant kind resolution ──────────────────────────────────────────────

const ALLOWED_VARIANT_KINDS = new Set(["thumb", "preview", "web"]);

/**
 * Map width-based query params to variant kinds for responsive images.
 * Widths below 400 → thumb, 400-1000 → preview, above 1000 → web.
 */
const widthToVariantKind = (w: string): string | undefined => {
  const width = parseInt(w, 10);
  if (!Number.isFinite(width) || width <= 0) {
    return undefined;
  }
  if (width <= 400) {
    return "thumb";
  }
  if (width <= 1000) {
    return "preview";
  }
  return "web";
};

// ─── Factory ──────────────────────────────────────────────────────────────

/**
 * Create the FM public media Express router.
 *
 * Serves `GET /:uid` with variant resolution, content-type detection,
 * cache headers, and S3 redirect caching. Mount at your canonical
 * media path (e.g. `/media`).
 *
 * @param config - Router configuration (service, cache-control, variant fallback, redirect cache).
 * @returns An Express Router with the public media endpoint.
 */
export function createFmPublicRouter(
  config: CreateFmPublicRouterConfig,
): Router {
  const {
    service,
    cacheControl = "public, max-age=86400, immutable",
    enableVariantFallback = true,
  } = config;

  const cacheEnabled = config.cache?.enabled !== false;
  const redirectCache = cacheEnabled ? new RedirectCache(config.cache) : null;

  const router = Router();

  // ── GET /:uid — public content endpoint ───────────────────────────

  router.get(
    "/:uid",
    async (req: Request, res: Response, _next: NextFunction) => {
      try {
        const fileUid = getSingleParam(req.params.uid);
        if (!fileUid) {
          res.status(400).end();
          return;
        }

        // Resolve variant from query params
        let variantKind: string | undefined;
        const variantParam = (req.query.variant || "") as string;
        const wParam = (req.query.w || "") as string;

        if (variantParam && ALLOWED_VARIANT_KINDS.has(variantParam)) {
          variantKind = variantParam;
        } else if (wParam) {
          variantKind = widthToVariantKind(wParam);
        }

        const download = String(req.query.download || "").trim() === "1";

        // Check redirect cache first (S3 signed URLs)
        const cacheKey = `${fileUid}:${variantKind || "original"}${download ? ":dl" : ""}`;
        if (redirectCache) {
          const cached = redirectCache.get(cacheKey);
          if (cached) {
            res.setHeader("Cache-Control", cacheControl);
            res.redirect(302, cached);
            return;
          }
        }

        // Resolve content access via FmServiceCore
        let access;
        try {
          access = await service.resolveContentAccess({
            fileUid,
            variantKind,
          });
        } catch (err) {
          // If variant resolution failed and fallback is enabled, try original
          if (enableVariantFallback && variantKind) {
            try {
              access = await service.resolveContentAccess({ fileUid });
            } catch {
              res.status(404).end();
              return;
            }
          } else {
            if (err instanceof FmNotFoundError) {
              res.status(404).end();
              return;
            }
            throw err;
          }
        }

        // Public endpoint: only serve public, non-archived files
        if (!access.file.is_public || access.file.archived_at) {
          res.status(404).end();
          return;
        }

        // Common headers
        if (access.contentType) {
          res.type(access.contentType);
        }
        if (access.file.sha256) {
          res.setHeader("ETag", `"${access.file.sha256}"`);
        }

        // Download disposition
        if (download) {
          const filename = access.file.original_filename || access.file.uid;
          res.setHeader(
            "Content-Disposition",
            `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
          );
        }

        // ── S3: redirect to signed URL ──────────────────────────────
        if (access.redirectUrl) {
          res.setHeader("Cache-Control", cacheControl);
          if (redirectCache) {
            redirectCache.set(cacheKey, access.redirectUrl);
          }
          res.redirect(302, access.redirectUrl);
          return;
        }

        // ── Local: stream via sendFile ──────────────────────────────
        if (access.provider === "local" && access.absPath) {
          // Check file existence before attempting sendFile
          if (!fs.existsSync(access.absPath)) {
            // Variant fallback: if variant file is missing, try original
            if (enableVariantFallback && variantKind) {
              try {
                const originalAccess = await service.resolveContentAccess({
                  fileUid,
                });
                if (
                  originalAccess.provider === "local" &&
                  originalAccess.absPath &&
                  fs.existsSync(originalAccess.absPath)
                ) {
                  if (originalAccess.contentType) {
                    res.type(originalAccess.contentType);
                  }
                  res.setHeader(
                    "Cache-Control",
                    access.file.is_public
                      ? cacheControl
                      : "private, max-age=0, no-store",
                  );
                  res.sendFile(originalAccess.absPath, { dotfiles: "allow" });
                  return;
                }
              } catch {
                // fall through to 404
              }
            }
            res.status(404).end();
            return;
          }

          res.setHeader(
            "Cache-Control",
            access.file.is_public
              ? cacheControl
              : "private, max-age=0, no-store",
          );
          // dotfiles: 'allow' — required for .data/ paths
          res.sendFile(access.absPath, { dotfiles: "allow" }, (err) => {
            if (err && !res.headersSent) {
              res.status(404).end();
            }
          });
          return;
        }

        res.status(404).end();
      } catch (err) {
        if (isFmError(err)) {
          sendFmError(res, err);
        } else {
          res.status(500).end();
        }
      }
    },
  );

  return router;
}
