/**
 * FM Admin Router Factory — shared-utils/server/src/fm/express
 *
 * Creates a fully-wired Express router that exposes the complete admin FM
 * HTTP contract.  The host app provides:
 *  - a FmServiceCore instance (with connector + storage already wired)
 *  - an FmAuthzResult adapter (from createFmAuthz)
 *  - optional hooks and configuration
 *
 * This router consolidates ALL FM admin endpoints:
 *  - Upload flows (init / finalize / proxied, for both files and variants)
 *  - File CRUD, listing, metadata, content streaming
 *  - Archive / restore / delete / move
 *  - Link management (optional, behind allowLinks flag)
 *
 * Mount example:
 *   const fmAuthz = createFmAuthz({ resolveContext: myResolver });
 *   app.use("/api/fm",
 *     authMiddleware,
 *     fmAuthz.middleware,
 *     createFmRouter({ service, authz: fmAuthz }),
 *   );
 */
import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import express from "express";

import type { FmServiceCore, FmDeleteOutcome } from "../FmServiceCore.js";
import type { FmAuthzResult } from "./authz.js";
import type {
  FmWriteEvent,
  FmContext,
  FmFilesOrderBy,
  FmOrderDirection,
} from "../../../../utils/src/fm/types.js";
import {
  isFmError,
  sendFmError,
  FmAuthorizationError,
} from "../../../../utils/src/fm/errors.js";
import {
  FmFilePatchRequestSchema,
  FmFileRenameRequestSchema,
  FmMoveRequestSchema,
  FmLinkCreateRequestSchema,
  FmLinkDeleteRequestSchema,
} from "../../../../utils/src/fm/types.js";
import { getSingleParam } from "../../express/params.js";

// ─── Types ────────────────────────────────────────────────────────────────

export interface CreateFmRouterConfig {
  /** FmServiceCore instance. */
  service: FmServiceCore;

  /** Authorization adapter returned by createFmAuthz(). */
  authz: FmAuthzResult;

  /**
   * Optional callback after every successful write operation
   * (upload, delete, move, archive, restore, patch).
   * Best-effort; errors are swallowed.
   */
  onAfterWrite?: (params: {
    event: FmWriteEvent;
    req: Request;
  }) => void | Promise<void>;

  /** JSON body limit for init/finalize/move/patch requests. Default: "2mb". */
  jsonBodyLimit?: string;

  /** Raw body limit for proxied uploads. Default: "25mb". */
  proxiedUploadBodyLimit?: string;

  /** Enable link CRUD routes (GET/POST/DELETE /files/:fileUid/links). Default: false. */
  allowLinks?: boolean;

  /** Enable content streaming route (GET /files/:fileUid/content). Default: true. */
  enableContentStreaming?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

const ok = (res: Response, data: unknown, status = 200): void => {
  res.status(status).json({ success: true, data });
};

const parseIntOr = (val: unknown, fallback: number): number => {
  const n = parseInt(String(val), 10);
  return Number.isFinite(n) ? n : fallback;
};

const coerceBoolean = (v: unknown): boolean => {
  if (typeof v === "boolean") {
    return v;
  }
  const s = String(v ?? "")
    .trim()
    .toLowerCase();
  return s === "1" || s === "true" || s === "yes";
};

const pickFirst = <T>(xs: T[] | T | undefined): T | undefined => {
  if (xs === undefined || xs === null) {
    return undefined;
  }
  if (Array.isArray(xs)) {
    return xs.length ? xs[0] : undefined;
  }
  return xs;
};

const VALID_ORDER_BY = new Set<string>([
  "created_at",
  "updated_at",
  "byte_size",
  "original_filename",
  "title",
]);

const VALID_ORDER_DIRECTION = new Set<string>(["asc", "desc"]);

const toTrimmedStringOrEmpty = (v: unknown): string => {
  if (v === null || v === undefined) {
    return "";
  }
  return String(v).trim();
};

// ─── Factory ──────────────────────────────────────────────────────────────

/**
 * Create the FM admin Express router.
 *
 * Returns a fully-wired router with upload, CRUD, content streaming,
 * archive/restore/delete, move, and optional link management endpoints.
 * Mount behind your auth middleware:
 *
 * ```ts
 * app.use("/api/fm", authMiddleware, fmAuthz.middleware, createFmRouter({ service, authz: fmAuthz }));
 * ```
 *
 * @param config - Router configuration (service, authz, optional hooks and limits).
 * @returns An Express Router with all FM admin routes.
 */
export function createFmRouter(config: CreateFmRouterConfig): Router {
  const {
    service,
    authz,
    onAfterWrite,
    jsonBodyLimit = "2mb",
    proxiedUploadBodyLimit = "25mb",
    allowLinks = false,
    enableContentStreaming = true,
  } = config;

  const router = Router();
  const jsonParser = express.json({ limit: jsonBodyLimit });

  // ── After-write helper (best-effort, never throws to caller) ──────
  const fireAfterWrite = async (
    event: FmWriteEvent,
    req: Request,
  ): Promise<void> => {
    if (!onAfterWrite) {
      return;
    }
    try {
      await onAfterWrite({ event, req });
    } catch (hookErr) {
      // eslint-disable-next-line no-console
      console.warn("[FmRouter] onAfterWrite hook error:", hookErr);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  //  UPLOAD FLOWS
  // ═══════════════════════════════════════════════════════════════════════

  // POST /upload/init
  router.post(
    "/upload/init",
    jsonParser,
    async (req: Request, res: Response) => {
      try {
        const ctx = authz.getActorContext(req);
        const result = await service.uploadInit({
          request: req.body,
          ownerUserUid: ctx.userUid,
          createdBy: ctx.createdBy || ctx.userUid,
        });
        await fireAfterWrite(
          { action: "upload", fileUid: result.fileUid, userUid: ctx.userUid },
          req,
        );
        ok(res, result);
      } catch (err) {
        sendFmError(res, err);
      }
    },
  );

  // POST /upload/finalize
  router.post(
    "/upload/finalize",
    jsonParser,
    async (req: Request, res: Response) => {
      try {
        const ctx = authz.getActorContext(req);
        const result = await service.uploadFinalize({ request: req.body });
        await fireAfterWrite(
          { action: "upload", fileUid: result.file.uid, userUid: ctx.userUid },
          req,
        );
        ok(res, result);
      } catch (err) {
        sendFmError(res, err);
      }
    },
  );

  // POST /upload/:fileUid/proxy — proxied upload (raw binary body)
  router.post(
    "/upload/:fileUid/proxy",
    express.raw({ type: "*/*", limit: proxiedUploadBodyLimit }),
    async (req: Request, res: Response) => {
      try {
        const ctx = authz.getActorContext(req);
        const fileUid = getSingleParam(req.params.fileUid);
        if (!fileUid) {
          res.status(400).json({ success: false, message: "Missing fileUid" });
          return;
        }

        const body = req.body as Buffer;
        if (!Buffer.isBuffer(body) || body.length === 0) {
          res
            .status(400)
            .json({ success: false, message: "Missing upload body" });
          return;
        }

        const result = await service.uploadWriteAndFinalize({
          fileUid,
          body,
          contentType: req.header("content-type") || undefined,
        });
        await fireAfterWrite(
          { action: "upload", fileUid, userUid: ctx.userUid },
          req,
        );
        ok(res, result);
      } catch (err) {
        sendFmError(res, err);
      }
    },
  );

  // ═══════════════════════════════════════════════════════════════════════
  //  VARIANT UPLOAD FLOWS
  // ═══════════════════════════════════════════════════════════════════════

  // POST /variants/upload/init
  router.post(
    "/variants/upload/init",
    jsonParser,
    async (req: Request, res: Response) => {
      try {
        authz.getActorContext(req); // ensure authenticated
        const result = await service.variantUploadInit({ request: req.body });
        ok(res, result);
      } catch (err) {
        sendFmError(res, err);
      }
    },
  );

  // POST /variants/upload/finalize
  router.post(
    "/variants/upload/finalize",
    jsonParser,
    async (req: Request, res: Response) => {
      try {
        const ctx = authz.getActorContext(req);
        const result = await service.variantUploadFinalize({
          request: req.body,
        });
        await fireAfterWrite(
          {
            action: "variant-upload",
            fileUid: result.variant.variant_of_uid,
            userUid: ctx.userUid,
          },
          req,
        );
        ok(res, result);
      } catch (err) {
        sendFmError(res, err);
      }
    },
  );

  // POST /variants/upload/:variantUid/proxy — proxied variant upload
  router.post(
    "/variants/upload/:variantUid/proxy",
    express.raw({ type: "*/*", limit: proxiedUploadBodyLimit }),
    async (req: Request, res: Response) => {
      try {
        const ctx = authz.getActorContext(req);
        const variantUid = getSingleParam(req.params.variantUid);
        if (!variantUid) {
          res
            .status(400)
            .json({ success: false, message: "Missing variantUid" });
          return;
        }

        const body = req.body as Buffer;
        if (!Buffer.isBuffer(body) || body.length === 0) {
          res
            .status(400)
            .json({ success: false, message: "Missing upload body" });
          return;
        }

        const result = await service.variantUploadWriteAndFinalize({
          variantUid,
          body,
          contentType: req.header("content-type") || undefined,
        });
        await fireAfterWrite(
          {
            action: "variant-upload",
            fileUid: result.variant.variant_of_uid,
            userUid: ctx.userUid,
          },
          req,
        );
        ok(res, result);
      } catch (err) {
        sendFmError(res, err);
      }
    },
  );

  // ═══════════════════════════════════════════════════════════════════════
  //  FILE LISTING
  // ═══════════════════════════════════════════════════════════════════════

  // GET /files
  router.get("/files", async (req: Request, res: Response) => {
    try {
      const ctx = authz.getActorContext(req);

      // Non-admins are scoped to their own files.
      const requestedOwner = pickFirst(
        req.query.ownerUserUid as string | string[] | undefined,
      );
      const ownerUserUid = ctx.isAdmin
        ? requestedOwner
          ? String(requestedOwner)
          : undefined
        : ctx.userUid;

      const search =
        pickFirst(req.query.search as string | string[] | undefined) ||
        pickFirst(req.query.q as string | string[] | undefined) ||
        undefined;

      const includeArchived =
        req.query.includeArchived !== undefined
          ? coerceBoolean(
              pickFirst(
                req.query.includeArchived as string | string[] | undefined,
              ),
            )
          : false;

      const isPublic =
        req.query.isPublic !== undefined
          ? coerceBoolean(
              pickFirst(req.query.isPublic as string | string[] | undefined),
            )
          : undefined;

      const orderByRaw = String(
        pickFirst(req.query.orderBy as string | string[] | undefined) ||
          pickFirst(req.query.sortBy as string | string[] | undefined) ||
          "",
      );
      const orderDirectionRaw = String(
        pickFirst(req.query.orderDirection as string | string[] | undefined) ||
          pickFirst(req.query.sortOrder as string | string[] | undefined) ||
          "",
      );

      const orderBy: FmFilesOrderBy | undefined = VALID_ORDER_BY.has(orderByRaw)
        ? (orderByRaw as FmFilesOrderBy)
        : undefined;
      const orderDirection: FmOrderDirection | undefined =
        VALID_ORDER_DIRECTION.has(orderDirectionRaw)
          ? (orderDirectionRaw as FmOrderDirection)
          : undefined;

      const result = await service.listFiles({
        search: search ? String(search) : undefined,
        ownerUserUid,
        isPublic,
        includeArchived,
        limit: parseIntOr(
          pickFirst(req.query.limit as string | string[] | undefined),
          25,
        ),
        offset: parseIntOr(
          pickFirst(req.query.offset as string | string[] | undefined),
          0,
        ),
        orderBy,
        orderDirection,
        includeVariants: coerceBoolean(
          pickFirst(req.query.includeVariants as string | string[] | undefined),
        ),
      });

      ok(res, result);
    } catch (err) {
      sendFmError(res, err);
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  //  FILE DETAIL
  // ═══════════════════════════════════════════════════════════════════════

  // GET /files/:fileUid
  router.get("/files/:fileUid", async (req: Request, res: Response) => {
    try {
      const ctx = authz.getActorContext(req);
      const fileUid = getSingleParam(req.params.fileUid);
      if (!fileUid) {
        res.status(400).json({ success: false, message: "Missing fileUid" });
        return;
      }
      const file = await service.getFileByUid(fileUid);
      if (!file) {
        res.status(404).json({ success: false, message: "Not found" });
        return;
      }

      // Non-admins can only see their own files
      assertOwnerOrAdmin(file, ctx);
      ok(res, file);
    } catch (err) {
      sendFmError(res, err);
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  //  PATCH METADATA
  // ═══════════════════════════════════════════════════════════════════════

  // PATCH /files/:fileUid
  router.patch(
    "/files/:fileUid",
    jsonParser,
    async (req: Request, res: Response) => {
      try {
        const ctx = authz.getActorContext(req);
        const fileUid = getSingleParam(req.params.fileUid);
        if (!fileUid) {
          res.status(400).json({ success: false, message: "Missing fileUid" });
          return;
        }

        // Validate request body shape
        const parsed = FmFilePatchRequestSchema.safeParse(req.body || {});
        if (!parsed.success) {
          res.status(400).json({
            success: false,
            message: "Invalid patch body",
            details: parsed.error.flatten().fieldErrors,
          });
          return;
        }

        // Verify ownership before patching
        const existing = await service.getFileByUid(fileUid);
        if (!existing) {
          res.status(404).json({ success: false, message: "Not found" });
          return;
        }
        assertOwnerOrAdmin(existing, ctx);

        // Normalize camelCase aliases and constrain to allowed fields
        const body = parsed.data;
        const patch: {
          title?: string;
          alt_text?: string;
          tags?: string[];
          is_public?: boolean;
        } = {};

        if (body.title !== undefined) {
          patch.title = String(body.title).trim();
        }
        if (body.alt_text !== undefined || body.altText !== undefined) {
          patch.alt_text = String(body.alt_text ?? body.altText ?? "").trim();
        }
        if (body.is_public !== undefined || body.isPublic !== undefined) {
          patch.is_public = coerceBoolean(body.is_public ?? body.isPublic);
        }
        if (body.tags !== undefined) {
          patch.tags = Array.isArray(body.tags)
            ? body.tags
                .map((t: unknown) => String(t ?? "").trim())
                .filter(Boolean)
            : undefined;
        }

        if (Object.keys(patch).length === 0) {
          res.status(400).json({ success: false, message: "No valid fields" });
          return;
        }

        const updated = await service.patchFile({ fileUid, patch });
        ok(res, updated);
      } catch (err) {
        sendFmError(res, err);
      }
    },
  );

  // ═══════════════════════════════════════════════════════════════════════
  //  RENAME (original filename)
  // ═══════════════════════════════════════════════════════════════════════

  // POST /files/:fileUid/rename
  router.post(
    "/files/:fileUid/rename",
    jsonParser,
    async (req: Request, res: Response) => {
      try {
        const ctx = authz.getActorContext(req);
        const fileUid = getSingleParam(req.params.fileUid);
        if (!fileUid) {
          res.status(400).json({ success: false, message: "Missing fileUid" });
          return;
        }

        const parsed = FmFileRenameRequestSchema.safeParse(req.body || {});
        if (!parsed.success) {
          res.status(400).json({
            success: false,
            message: "Invalid rename body",
            details: parsed.error.flatten().fieldErrors,
          });
          return;
        }

        const existing = await service.getFileByUid(fileUid);
        if (!existing) {
          res.status(404).json({ success: false, message: "Not found" });
          return;
        }
        assertOwnerOrAdmin(existing, ctx);

        const body = parsed.data;
        const originalFilename = String(
          (body as any).originalFilename ??
            (body as any).original_filename ??
            "",
        ).trim();

        const updated = await service.renameFile({
          fileUid,
          originalFilename,
          userUid: ctx.userUid,
        });

        await fireAfterWrite(
          { action: "patch", fileUid, userUid: ctx.userUid },
          req,
        );

        ok(res, updated);
      } catch (err) {
        sendFmError(res, err);
      }
    },
  );

  // ═══════════════════════════════════════════════════════════════════════
  //  OBJECT METADATA
  // ═══════════════════════════════════════════════════════════════════════

  // GET /files/:fileUid/object-metadata
  router.get(
    "/files/:fileUid/object-metadata",
    async (req: Request, res: Response) => {
      try {
        const ctx = authz.getActorContext(req);
        const fileUid = getSingleParam(req.params.fileUid);
        if (!fileUid) {
          res.status(400).json({ success: false, message: "Missing fileUid" });
          return;
        }

        const file = await service.getFileByUid(fileUid);
        if (!file) {
          res.status(404).json({ success: false, message: "Not found" });
          return;
        }
        assertOwnerOrAdmin(file, ctx);

        const variantKind = pickFirst(
          req.query.variantKind as string | string[] | undefined,
        );
        const result = await service.getStorageObjectMetadata({
          fileUid,
          variantKind: variantKind ? String(variantKind) : undefined,
        });

        ok(res, result);
      } catch (err) {
        sendFmError(res, err);
      }
    },
  );

  // ═══════════════════════════════════════════════════════════════════════
  //  URL RESOLUTION
  // ═══════════════════════════════════════════════════════════════════════

  // GET /files/:fileUid/url
  router.get("/files/:fileUid/url", async (req: Request, res: Response) => {
    try {
      const ctx = authz.getActorContext(req);
      const fileUid = getSingleParam(req.params.fileUid);
      if (!fileUid) {
        res.status(400).json({ success: false, message: "Missing fileUid" });
        return;
      }

      const file = await service.getFileByUid(fileUid);
      if (!file) {
        res.status(404).json({ success: false, message: "Not found" });
        return;
      }

      // Public files are accessible; private files require ownership
      if (!file.is_public) {
        assertOwnerOrAdmin(file, ctx);
      }

      const variantKind = pickFirst(
        req.query.variantKind as string | string[] | undefined,
      );
      const expiresInSeconds =
        parseIntOr(
          pickFirst(
            req.query.expiresInSeconds as string | string[] | undefined,
          ),
          0,
        ) || undefined;

      const result = await service.resolveReadUrl({
        fileUid,
        variantKind: variantKind ? String(variantKind) : undefined,
        req,
        expiresInSeconds,
      });

      ok(res, result);
    } catch (err) {
      sendFmError(res, err);
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  //  CONTENT STREAMING
  // ═══════════════════════════════════════════════════════════════════════

  if (enableContentStreaming) {
    // GET /files/:fileUid/content
    router.get(
      "/files/:fileUid/content",
      async (req: Request, res: Response) => {
        try {
          const ctx = authz.getActorContext(req);
          const fileUid = getSingleParam(req.params.fileUid);
          if (!fileUid) {
            res
              .status(400)
              .json({ success: false, message: "Missing fileUid" });
            return;
          }

          const variantKindRaw = toTrimmedStringOrEmpty(
            pickFirst(req.query.variantKind as string | string[] | undefined),
          );
          const variantKind =
            variantKindRaw && variantKindRaw !== "original"
              ? variantKindRaw
              : undefined;

          const access = await service.resolveContentAccess({
            fileUid,
            variantKind,
          });

          // Ownership check (public files are ok for authenticated users)
          if (!access.file.is_public) {
            assertOwnerOrAdmin(access.file, ctx);
          }

          // Download disposition
          const download =
            String(
              pickFirst(req.query.download as string | string[] | undefined) ||
                "",
            ).trim() === "1";
          if (download) {
            const filename = access.file.original_filename || access.file.uid;
            res.setHeader(
              "Content-Disposition",
              `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
            );
          }

          // Common headers
          res.setHeader("Cache-Control", "private, max-age=0, no-store");
          if (access.contentType) {
            res.type(access.contentType);
          }

          if (access.provider === "local" && access.absPath) {
            // Local: stream via sendFile
            // dotfiles: 'allow' required for .data/ paths
            res.sendFile(access.absPath, { dotfiles: "allow" }, (err) => {
              if (err && !res.headersSent) {
                res.status(404).end();
              }
            });
            return;
          }

          if (access.redirectUrl) {
            // S3: redirect to signed URL
            res.redirect(302, access.redirectUrl);
            return;
          }

          res.status(404).end();
        } catch (err) {
          if (isFmError(err)) {
            sendFmError(res, err);
          } else {
            res.status(404).end();
          }
        }
      },
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  VARIANT LISTING
  // ═══════════════════════════════════════════════════════════════════════

  // GET /files/:fileUid/variants
  router.get(
    "/files/:fileUid/variants",
    async (req: Request, res: Response) => {
      try {
        const ctx = authz.getActorContext(req);
        const fileUid = getSingleParam(req.params.fileUid);
        if (!fileUid) {
          res.status(400).json({ success: false, message: "Missing fileUid" });
          return;
        }

        const file = await service.getFileByUid(fileUid);
        if (!file) {
          res.status(404).json({ success: false, message: "Not found" });
          return;
        }
        assertOwnerOrAdmin(file, ctx);

        const variants = await service.listVariantsForFile(fileUid);
        ok(res, { items: variants });
      } catch (err) {
        sendFmError(res, err);
      }
    },
  );

  // ═══════════════════════════════════════════════════════════════════════
  //  ARCHIVE / RESTORE / DELETE
  // ═══════════════════════════════════════════════════════════════════════

  // POST /files/:fileUid/archive
  router.post(
    "/files/:fileUid/archive",
    async (req: Request, res: Response) => {
      try {
        const ctx = authz.getActorContext(req);
        const fileUid = getSingleParam(req.params.fileUid);
        if (!fileUid) {
          res.status(400).json({ success: false, message: "Missing fileUid" });
          return;
        }

        const file = await service.getFileByUid(fileUid);
        if (!file) {
          res.status(404).json({ success: false, message: "Not found" });
          return;
        }
        assertOwnerOrAdmin(file, ctx);

        const updated = await service.archiveFile({
          fileUid,
          userUid: ctx.userUid,
        });
        await fireAfterWrite(
          { action: "archive", fileUid, userUid: ctx.userUid },
          req,
        );
        ok(res, updated);
      } catch (err) {
        sendFmError(res, err);
      }
    },
  );

  // POST /files/:fileUid/restore
  router.post(
    "/files/:fileUid/restore",
    async (req: Request, res: Response) => {
      try {
        const ctx = authz.getActorContext(req);
        const fileUid = getSingleParam(req.params.fileUid);
        if (!fileUid) {
          res.status(400).json({ success: false, message: "Missing fileUid" });
          return;
        }

        const file = await service.getFileByUid(fileUid);
        if (!file) {
          res.status(404).json({ success: false, message: "Not found" });
          return;
        }
        assertOwnerOrAdmin(file, ctx);

        const updated = await service.restoreFile({
          fileUid,
          userUid: ctx.userUid,
        });
        await fireAfterWrite(
          { action: "restore", fileUid, userUid: ctx.userUid },
          req,
        );
        ok(res, updated);
      } catch (err) {
        sendFmError(res, err);
      }
    },
  );

  // DELETE /files/:fileUid
  router.delete("/files/:fileUid", async (req: Request, res: Response) => {
    try {
      const ctx = authz.getActorContext(req);
      const fileUid = getSingleParam(req.params.fileUid);
      if (!fileUid) {
        res.status(400).json({ success: false, message: "Missing fileUid" });
        return;
      }

      const file = await service.getFileByUid(fileUid);
      if (!file) {
        res.status(404).json({ success: false, message: "Not found" });
        return;
      }
      assertOwnerOrAdmin(file, ctx);

      const force = coerceBoolean(
        pickFirst(req.query.force as string | string[] | undefined),
      );
      const result: FmDeleteOutcome = await service.deleteFile({
        fileUid,
        force,
        isAdmin: ctx.isAdmin,
        userUid: ctx.userUid,
      });

      await fireAfterWrite(
        { action: "delete", fileUid, userUid: ctx.userUid },
        req,
      );
      ok(res, result);
    } catch (err) {
      sendFmError(res, err);
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  //  MOVE
  // ═══════════════════════════════════════════════════════════════════════

  // POST /files/:fileUid/move
  router.post(
    "/files/:fileUid/move",
    jsonParser,
    async (req: Request, res: Response) => {
      try {
        const ctx = authz.getActorContext(req);
        const fileUid = getSingleParam(req.params.fileUid);
        if (!fileUid) {
          res.status(400).json({ success: false, message: "Missing fileUid" });
          return;
        }

        // Validate request body
        const parsed = FmMoveRequestSchema.safeParse(req.body || {});
        if (!parsed.success) {
          res.status(400).json({
            success: false,
            message: "Invalid move request",
            details: parsed.error.flatten().fieldErrors,
          });
          return;
        }

        const file = await service.getFileByUid(fileUid);
        if (!file) {
          res.status(404).json({ success: false, message: "Not found" });
          return;
        }
        assertOwnerOrAdmin(file, ctx);

        const result = await service.moveFile({
          fileUid,
          toBucket: parsed.data.toBucket,
          toFolderPath: parsed.data.toFolderPath,
          userUid: ctx.userUid,
        });

        await fireAfterWrite(
          { action: "move", fileUid, userUid: ctx.userUid },
          req,
        );
        ok(res, result);
      } catch (err) {
        sendFmError(res, err);
      }
    },
  );

  // ═══════════════════════════════════════════════════════════════════════
  //  LINK MANAGEMENT (behind allowLinks flag)
  // ═══════════════════════════════════════════════════════════════════════

  if (allowLinks) {
    // GET /files/:fileUid/links
    router.get("/files/:fileUid/links", async (req: Request, res: Response) => {
      try {
        const ctx = authz.getActorContext(req);
        if (!ctx.isAdmin) {
          res.status(403).json({ success: false, message: "Forbidden" });
          return;
        }

        const fileUid = getSingleParam(req.params.fileUid);
        if (!fileUid) {
          res.status(400).json({ success: false, message: "Missing fileUid" });
          return;
        }
        const limit = parseIntOr(
          pickFirst(req.query.limit as string | string[] | undefined),
          50,
        );
        const offset = parseIntOr(
          pickFirst(req.query.offset as string | string[] | undefined),
          0,
        );

        const result = await service.listLinksForFile(fileUid, {
          limit: Math.min(200, Math.max(1, limit)),
          offset: Math.max(0, offset),
        });

        ok(res, result);
      } catch (err) {
        sendFmError(res, err);
      }
    });

    // POST /files/:fileUid/links
    router.post(
      "/files/:fileUid/links",
      jsonParser,
      async (req: Request, res: Response) => {
        try {
          const ctx = authz.getActorContext(req);
          if (!ctx.isAdmin) {
            res.status(403).json({ success: false, message: "Forbidden" });
            return;
          }

          const fileUid = getSingleParam(req.params.fileUid);
          if (!fileUid) {
            res
              .status(400)
              .json({ success: false, message: "Missing fileUid" });
            return;
          }

          // Validate request body
          const parsed = FmLinkCreateRequestSchema.safeParse(req.body || {});
          if (!parsed.success) {
            res.status(400).json({
              success: false,
              message: "Invalid link create request",
              details: parsed.error.flatten().fieldErrors,
            });
            return;
          }

          const body = parsed.data;
          const linkedEntityType = toTrimmedStringOrEmpty(
            body.linked_entity_type ?? body.linkedEntityType,
          );
          const linkedEntityUid = toTrimmedStringOrEmpty(
            body.linked_entity_uid ?? body.linkedEntityUid,
          );
          const linkedField =
            toTrimmedStringOrEmpty(body.linked_field ?? body.linkedField) ||
            "body";

          const link = await service.createLink({
            file_uid: fileUid,
            linked_entity_type: linkedEntityType,
            linked_entity_uid: linkedEntityUid,
            linked_field: linkedField,
            created_by: ctx.userUid,
          });

          ok(res, link);
        } catch (err) {
          sendFmError(res, err);
        }
      },
    );

    // DELETE /files/:fileUid/links
    router.delete(
      "/files/:fileUid/links",
      jsonParser,
      async (req: Request, res: Response) => {
        try {
          const ctx = authz.getActorContext(req);
          if (!ctx.isAdmin) {
            res.status(403).json({ success: false, message: "Forbidden" });
            return;
          }

          const fileUid = getSingleParam(req.params.fileUid);
          if (!fileUid) {
            res
              .status(400)
              .json({ success: false, message: "Missing fileUid" });
            return;
          }

          // Merge query params and body for flexibility
          const merged = {
            ...(req.body || {}),
            // Query params override body (they're more specific/visible)
            ...(req.query.linked_entity_type
              ? { linked_entity_type: req.query.linked_entity_type }
              : {}),
            ...(req.query.linkedEntityType
              ? { linkedEntityType: req.query.linkedEntityType }
              : {}),
            ...(req.query.linked_entity_uid
              ? { linked_entity_uid: req.query.linked_entity_uid }
              : {}),
            ...(req.query.linkedEntityUid
              ? { linkedEntityUid: req.query.linkedEntityUid }
              : {}),
          };

          const parsed = FmLinkDeleteRequestSchema.safeParse(merged);
          if (!parsed.success) {
            res.status(400).json({
              success: false,
              message: "Missing or invalid link delete fields",
              details: parsed.error.flatten().fieldErrors,
            });
            return;
          }

          const body = parsed.data;
          const linkedEntityType = toTrimmedStringOrEmpty(
            body.linked_entity_type ?? body.linkedEntityType,
          );
          const linkedEntityUid = toTrimmedStringOrEmpty(
            body.linked_entity_uid ?? body.linkedEntityUid,
          );

          await service.deleteLink({
            fileUid,
            linkedEntityType,
            linkedEntityUid,
          });

          ok(res, null);
        } catch (err) {
          sendFmError(res, err);
        }
      },
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  ERROR CATCH-ALL
  // ═══════════════════════════════════════════════════════════════════════

  router.use(
    (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
      sendFmError(res, err);
    },
  );

  return router;
}

// ─── Route-level ownership check ──────────────────────────────────────────

/**
 * Check that the current user owns the file or is admin.
 * Throws FmAuthorizationError if not.
 */
function assertOwnerOrAdmin(
  file: { owner_user_uid?: string | null },
  ctx: FmContext,
): void {
  if (ctx.isAdmin) {
    return;
  }
  const owner = file.owner_user_uid || null;
  const uid = ctx.userUid || null;
  if (!uid || !owner || owner !== uid) {
    throw new FmAuthorizationError();
  }
}
