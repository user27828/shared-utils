/**
 * CMS Admin Express Router Factory — shared-utils
 *
 * Creates a fully-wired Express router that exposes the complete
 * admin CMS HTTP contract.  The host app provides:
 *  - a CmsServiceCore instance (with its connector already wired)
 *  - an authz adapter (from createCmsAuthz)
 *  - optional hooks (onAfterWrite, bodyLimitBytes)
 *
 * Mount example:
 *   app.use("/api/admin/cms",
 *     express.json({ limit: "1mb" }),
 *     authMiddleware,
 *     cmsAdminRateLimitMiddleware,
 *     createCmsAdminRouter({ service, authz }),
 *   );
 */
import { Router } from "express";
import type { Request, Response, NextFunction } from "express";

import {
  isCmsError,
  cmsErrorToResponse,
} from "../../../../utils/src/cms/errors.js";
import {
  assertIfMatchSatisfied,
  computeCmsEtag,
} from "../../../../utils/src/cms/concurrency.js";
import { getSingleParam } from "../../express/params.js";
import type { CmsServiceCore } from "../CmsServiceCore.js";
import type { CmsActorContext } from "../authz.js";

// ─── Types ────────────────────────────────────────────────────────────────

export interface CmsAdminRouterConfig {
  /** CmsServiceCore instance. */
  service: CmsServiceCore;

  /**
   * Authorization adapter returned by createCmsAuthz().
   * Each method is Express middleware that sets req.cmsActor.
   */
  authz: {
    requireAuthor: (req: Request, res: Response, next: NextFunction) => void;
    requirePublisher: (req: Request, res: Response, next: NextFunction) => void;
    getActorContext: (req: Request) => CmsActorContext;
  };

  /**
   * Optional callback after every successful write (create/update/publish/
   * trash/restore/delete).  Useful for syncing file-link references or
   * flushing caches.
   */
  onAfterWrite?: (params: {
    uid: string;
    event: string;
    actorUid: string;
    row?: Record<string, any> | null;
    req: Request;
  }) => void | Promise<void>;

  /**
   * Optional resolver that maps user UUIDs to email addresses.
   * Used to enrich history rows with author emails.
   * Return a Map<uuid, email>; missing entries are silently skipped.
   */
  resolveUserEmails?: (uuids: string[]) => Promise<Map<string, string>>;

  /** Max allowed body size in bytes.  Default: 1_048_576 (1 MB). */
  bodyLimitBytes?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

const ok = (res: Response, data: any, status = 200) => {
  res.status(status).json({ success: true, data });
};

const setEtagHeader = (res: Response, row: any) => {
  if (row?.etag) {
    res.set("ETag", row.etag);
  }
};

const sendCmsError = (res: Response, err: unknown) => {
  if (isCmsError(err)) {
    const body = cmsErrorToResponse(err);
    res.status(err.statusCode).json(body);
    return;
  }
  const statusCode = Number(
    (err as any)?.statusCode || (err as any)?.status || 500,
  );
  const message = String((err as any)?.message || "Internal server error");
  res.status(statusCode).json({ success: false, message });
};

const parseIntOr = (val: any, fallback: number): number => {
  const n = parseInt(val, 10);
  return Number.isFinite(n) ? n : fallback;
};

const parseBoolQuery = (val: any): boolean | undefined => {
  if (val === "true" || val === "1") {
    return true;
  }
  if (val === "false" || val === "0") {
    return false;
  }
  return undefined;
};

// ─── Factory ──────────────────────────────────────────────────────────────

export function createCmsAdminRouter(cfg: CmsAdminRouterConfig): Router {
  const {
    service,
    authz,
    onAfterWrite,
    resolveUserEmails,
    bodyLimitBytes = 1_048_576,
  } = cfg;
  const router = Router();

  // ── Body size guard (non-safe methods) ────────────────────────────────
  router.use((req: Request, res: Response, next: NextFunction) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      return next();
    }

    const cl = parseInt(req.headers["content-length"] || "0", 10);
    if (cl > bodyLimitBytes) {
      res
        .status(413)
        .json({ success: false, message: "Request body too large" });
      return;
    }

    try {
      const len = Buffer.byteLength(JSON.stringify(req.body ?? ""), "utf8");
      if (len > bodyLimitBytes) {
        res
          .status(413)
          .json({ success: false, message: "Request body too large" });
        return;
      }
    } catch {
      res.status(400).json({ success: false, message: "Invalid request body" });
      return;
    }

    next();
  });

  // ── After-write helper ────────────────────────────────────────────────
  const fireAfterWrite = async (
    uid: string,
    event: string,
    actorUid: string,
    row: any,
    req: Request,
  ) => {
    if (onAfterWrite) {
      try {
        await onAfterWrite({ uid, event, actorUid, row, req });
      } catch (hookErr) {
        // best-effort
        if (typeof console !== "undefined") {
          console.warn("[CmsAdminRouter] onAfterWrite hook error:", hookErr);
        }
      }
    }
  };

  /**
   * Enrich metadata user_uids with email addresses.
   * Adds `user_email` alongside `user_uid` on version meta and each
   * content note entry.  Non-fatal — returns silently on failure.
   */
  const enrichMetadataEmails = async (row: any): Promise<void> => {
    if (!resolveUserEmails || !row?.metadata) {
      return;
    }
    try {
      const meta = row.metadata;
      const uuids = new Set<string>();
      if (meta.version?.user_uid) {
        uuids.add(meta.version.user_uid);
      }
      if (Array.isArray(meta.notes)) {
        for (const n of meta.notes) {
          if (n?.user_uid) {
            uuids.add(n.user_uid);
          }
        }
      }
      if (uuids.size === 0) {
        return;
      }
      const emailMap = await resolveUserEmails([...uuids]);
      if (meta.version?.user_uid) {
        const email = emailMap.get(meta.version.user_uid);
        if (email) {
          meta.version.user_email = email;
        }
      }
      if (Array.isArray(meta.notes)) {
        for (const n of meta.notes) {
          if (n?.user_uid) {
            const email = emailMap.get(n.user_uid);
            if (email) {
              n.user_email = email;
            }
          }
        }
      }
    } catch {
      // Non-fatal
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  //  LIST   GET /
  // ═══════════════════════════════════════════════════════════════════════
  router.get("/", authz.requireAuthor, async (req: Request, res: Response) => {
    try {
      const result = await service.list({
        q: (req.query.q as string) || undefined,
        status: (req.query.status as any) || undefined,
        post_type: (req.query.post_type as any) || undefined,
        locale: (req.query.locale as string) || undefined,
        tag: (req.query.tag as string) || undefined,
        limit: parseIntOr(req.query.limit, 50),
        offset: parseIntOr(req.query.offset, 0),
        orderBy: (req.query.orderBy as any) || "updated_at",
        orderDirection: (req.query.orderDirection as any) || "desc",
        includeTrash: parseBoolQuery(req.query.includeTrash),
      });
      ok(res, result);
    } catch (err) {
      sendCmsError(res, err);
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  //  GET BY UID   GET /:uid
  // ═══════════════════════════════════════════════════════════════════════
  router.get(
    "/:uid",
    authz.requireAuthor,
    async (req: Request, res: Response) => {
      try {
        const uid = getSingleParam(req.params.uid);
        if (!uid) {
          res.status(400).json({ success: false, message: "Missing uid" });
          return;
        }
        const row = await service.getByUid(uid);
        await enrichMetadataEmails(row);

        // Attach history count so the client knows whether to show
        // the history button without fetching all history items.
        try {
          const hist = await service.listHistory({ cmsUid: uid, limit: 0 });
          (row as any).history_count = hist.totalCount;
        } catch {
          // Non-fatal
        }

        setEtagHeader(res, row);
        ok(res, row);
      } catch (err) {
        sendCmsError(res, err);
      }
    },
  );

  // ═══════════════════════════════════════════════════════════════════════
  //  CREATE   POST /
  // ═══════════════════════════════════════════════════════════════════════
  router.post("/", authz.requireAuthor, async (req: Request, res: Response) => {
    try {
      const actor = authz.getActorContext(req);
      const row = await service.create({
        request: req.body,
        actorUserUid: actor.userUid,
      });
      await fireAfterWrite(row.uid, "create", actor.userUid, row, req);
      setEtagHeader(res, row);
      ok(res, row, 201);
    } catch (err) {
      sendCmsError(res, err);
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  //  UPDATE   PUT /:uid
  // ═══════════════════════════════════════════════════════════════════════
  router.put(
    "/:uid",
    authz.requireAuthor,
    async (req: Request, res: Response) => {
      try {
        const uid = getSingleParam(req.params.uid);
        if (!uid) {
          res.status(400).json({ success: false, message: "Missing uid" });
          return;
        }
        const ifMatch = req.headers["if-match"] as string | undefined;
        const actor = authz.getActorContext(req);
        const row = await service.updateByUid({
          uid,
          patch: req.body,
          ifMatchHeader: ifMatch ?? null,
          actorUserUid: actor.userUid,
        });
        await fireAfterWrite(uid, "update", actor.userUid, row, req);
        await enrichMetadataEmails(row);
        setEtagHeader(res, row);
        ok(res, row);
      } catch (err) {
        sendCmsError(res, err);
      }
    },
  );

  // ═══════════════════════════════════════════════════════════════════════
  //  PUBLISH   POST /:uid/publish
  // ═══════════════════════════════════════════════════════════════════════
  router.post(
    "/:uid/publish",
    authz.requirePublisher,
    async (req: Request, res: Response) => {
      try {
        const uid = getSingleParam(req.params.uid);
        if (!uid) {
          res.status(400).json({ success: false, message: "Missing uid" });
          return;
        }
        const ifMatch = req.headers["if-match"] as string | undefined;
        const actor = authz.getActorContext(req);
        const row = await service.publishByUid({
          uid,
          ifMatchHeader: ifMatch ?? null,
          actorUserUid: actor.userUid,
          ...(req.body?.publishedAt
            ? { publishedAt: req.body.publishedAt }
            : {}),
        });
        await fireAfterWrite(uid, "publish", actor.userUid, row, req);
        setEtagHeader(res, row);
        ok(res, row);
      } catch (err) {
        sendCmsError(res, err);
      }
    },
  );

  // ═══════════════════════════════════════════════════════════════════════
  //  TRASH   POST /:uid/trash
  // ═══════════════════════════════════════════════════════════════════════
  router.post(
    "/:uid/trash",
    authz.requireAuthor,
    async (req: Request, res: Response) => {
      try {
        const uid = getSingleParam(req.params.uid);
        if (!uid) {
          res.status(400).json({ success: false, message: "Missing uid" });
          return;
        }
        const ifMatch = req.headers["if-match"] as string | undefined;
        const actor = authz.getActorContext(req);
        const row = await service.trashByUid({
          uid,
          ifMatchHeader: ifMatch || "*",
          actorUserUid: actor.userUid,
        });
        await fireAfterWrite(uid, "trash", actor.userUid, row, req);
        ok(res, row);
      } catch (err) {
        sendCmsError(res, err);
      }
    },
  );

  // ═══════════════════════════════════════════════════════════════════════
  //  RESTORE  POST /:uid/restore
  // ═══════════════════════════════════════════════════════════════════════
  router.post(
    "/:uid/restore",
    authz.requireAuthor,
    async (req: Request, res: Response) => {
      try {
        const uid = getSingleParam(req.params.uid);
        if (!uid) {
          res.status(400).json({ success: false, message: "Missing uid" });
          return;
        }
        const ifMatch = req.headers["if-match"] as string | undefined;
        const actor = authz.getActorContext(req);
        const row = await service.restoreByUid({
          uid,
          ifMatchHeader: ifMatch || "*",
          actorUserUid: actor.userUid,
        });
        await fireAfterWrite(uid, "restore", actor.userUid, row, req);
        ok(res, row);
      } catch (err) {
        sendCmsError(res, err);
      }
    },
  );

  // ═══════════════════════════════════════════════════════════════════════
  //  DELETE   DELETE /:uid
  // ═══════════════════════════════════════════════════════════════════════
  router.delete(
    "/:uid",
    authz.requireAuthor,
    async (req: Request, res: Response) => {
      try {
        const uid = getSingleParam(req.params.uid);
        if (!uid) {
          res.status(400).json({ success: false, message: "Missing uid" });
          return;
        }
        const actor = authz.getActorContext(req);
        await service.deleteByUid({
          uid,
          actorUserUid: actor.userUid,
        });
        await fireAfterWrite(uid, "delete", actor.userUid, null, req);
        ok(res, null);
      } catch (err) {
        sendCmsError(res, err);
      }
    },
  );

  // ═══════════════════════════════════════════════════════════════════════
  //  EMPTY TRASH   POST /trash/empty
  // ═══════════════════════════════════════════════════════════════════════
  router.post(
    "/trash/empty",
    authz.requireAuthor,
    async (req: Request, res: Response) => {
      try {
        const limit = Math.min(
          parseIntOr(req.body?.limit ?? req.query.limit, 50),
          200,
        );
        const result = await service.emptyTrash({ limit });
        ok(res, result);
      } catch (err) {
        sendCmsError(res, err);
      }
    },
  );

  // ═══════════════════════════════════════════════════════════════════════
  //  LOCK   POST /:uid/lock
  // ═══════════════════════════════════════════════════════════════════════
  router.post(
    "/:uid/lock",
    authz.requireAuthor,
    async (req: Request, res: Response) => {
      try {
        const uid = getSingleParam(req.params.uid);
        if (!uid) {
          res.status(400).json({ success: false, message: "Missing uid" });
          return;
        }
        const actor = authz.getActorContext(req);
        const row = await service.lockByUid({
          uid,
          actorUserUid: actor.userUid,
        });
        ok(res, row);
      } catch (err) {
        sendCmsError(res, err);
      }
    },
  );

  // ═══════════════════════════════════════════════════════════════════════
  //  UNLOCK   DELETE /:uid/lock
  // ═══════════════════════════════════════════════════════════════════════
  router.delete(
    "/:uid/lock",
    authz.requireAuthor,
    async (req: Request, res: Response) => {
      try {
        const uid = getSingleParam(req.params.uid);
        if (!uid) {
          res.status(400).json({ success: false, message: "Missing uid" });
          return;
        }
        const actor = authz.getActorContext(req);
        const row = await service.unlockByUid({
          uid,
          actorUserUid: actor.userUid,
        });
        ok(res, row);
      } catch (err) {
        sendCmsError(res, err);
      }
    },
  );

  // ═══════════════════════════════════════════════════════════════════════
  //  COLLABORATORS   GET / PUT /:uid/collaborators
  // ═══════════════════════════════════════════════════════════════════════
  router.get(
    "/:uid/collaborators",
    authz.requireAuthor,
    async (req: Request, res: Response) => {
      try {
        const uid = getSingleParam(req.params.uid);
        if (!uid) {
          res.status(400).json({ success: false, message: "Missing uid" });
          return;
        }
        const result = await service.listCollaborators(uid);
        ok(res, result);
      } catch (err) {
        sendCmsError(res, err);
      }
    },
  );

  router.put(
    "/:uid/collaborators",
    authz.requireAuthor,
    async (req: Request, res: Response) => {
      try {
        const uid = getSingleParam(req.params.uid);
        if (!uid) {
          res.status(400).json({ success: false, message: "Missing uid" });
          return;
        }
        const result = await service.replaceCollaborators(
          uid,
          req.body?.collaborators ?? [],
        );
        ok(res, result);
      } catch (err) {
        sendCmsError(res, err);
      }
    },
  );

  // ═══════════════════════════════════════════════════════════════════════
  //  HISTORY   GET /:uid/history
  // ═══════════════════════════════════════════════════════════════════════
  router.get(
    "/:uid/history",
    authz.requireAuthor,
    async (req: Request, res: Response) => {
      try {
        const uid = getSingleParam(req.params.uid);
        if (!uid) {
          res.status(400).json({ success: false, message: "Missing uid" });
          return;
        }
        const result = await service.listHistory({
          cmsUid: uid,
          includeSoftDeleted: parseBoolQuery(req.query.includeSoftDeleted),
          limit: parseIntOr(req.query.limit, 50),
          offset: parseIntOr(req.query.offset, 0),
        });

        // Enrich items with author emails if resolver is provided
        if (resolveUserEmails && result.items?.length) {
          try {
            const uuids = new Set<string>();
            for (const r of result.items) {
              if (typeof r.created_by === "string" && r.created_by.length > 0) {
                uuids.add(r.created_by);
              }
              // Also collect user_uid from snapshot metadata version
              const snap = r.snapshot as Record<string, any> | null;
              const vmUid = snap?.metadata?.version?.user_uid;
              if (typeof vmUid === "string" && vmUid.length > 0) {
                uuids.add(vmUid);
              }
            }
            if (uuids.size > 0) {
              const emailMap = await resolveUserEmails([...uuids]);
              for (const item of result.items) {
                const email = emailMap.get(item.created_by as string);
                if (email) {
                  (item as any).created_by_email = email;
                }
                // Enrich snapshot version meta with email
                const snap = item.snapshot as Record<string, any> | null;
                const vmUid = snap?.metadata?.version?.user_uid;
                if (vmUid && emailMap.has(vmUid)) {
                  snap!.metadata.version.user_email = emailMap.get(vmUid);
                }
              }
            }
          } catch (_emailErr) {
            // Non-fatal: history still returned without emails
            console.warn("[cms-admin] resolveUserEmails failed:", _emailErr);
          }
        }

        // Summary mode: strip heavy snapshot fields for lightweight listing.
        // Client requests ?fields=summary when it only needs drawer metadata.
        const isSummary = req.query.fields === "summary";
        if (isSummary && result.items?.length) {
          for (const item of result.items) {
            const snap = item.snapshot as Record<string, any> | null;
            if (snap && typeof snap === "object") {
              // Keep only lightweight fields needed for the drawer display
              (item as any).snapshot = {
                metadata: snap.metadata ?? null,
                version_number: snap.version_number ?? null,
                status: snap.status ?? null,
              };
            }
          }
        }

        ok(res, result);
      } catch (err) {
        sendCmsError(res, err);
      }
    },
  );

  // ═══════════════════════════════════════════════════════════════════════
  //  RESTORE REVISION   POST /:uid/history/:historyId/restore
  // ═══════════════════════════════════════════════════════════════════════
  router.post(
    "/:uid/history/:historyId/restore",
    authz.requireAuthor,
    async (req: Request, res: Response) => {
      try {
        const uid = getSingleParam(req.params.uid);
        const historyIdRaw = getSingleParam(req.params.historyId);
        const historyId = historyIdRaw
          ? parseInt(historyIdRaw, 10)
          : Number.NaN;
        if (!uid || !Number.isFinite(historyId)) {
          res
            .status(400)
            .json({ success: false, message: "Invalid uid or historyId" });
          return;
        }
        const ifMatch = req.headers["if-match"] as string | undefined;
        const actor = authz.getActorContext(req);
        const row = await service.restoreHistoryRevision({
          cmsUid: uid,
          historyId,
          ifMatchHeader: ifMatch,
          actorUserUid: actor.userUid,
        });
        await fireAfterWrite(uid, "history_restore", actor.userUid, row, req);
        setEtagHeader(res, row);
        ok(res, row);
      } catch (err) {
        sendCmsError(res, err);
      }
    },
  );

  // ═══════════════════════════════════════════════════════════════════════
  //  SOFT-DELETE REVISION   POST /:uid/history/:historyId/delete
  // ═══════════════════════════════════════════════════════════════════════
  router.post(
    "/:uid/history/:historyId/delete",
    authz.requireAuthor,
    async (req: Request, res: Response) => {
      try {
        const actor = authz.getActorContext(req);
        const historyIdRaw = getSingleParam(req.params.historyId);
        const historyId = historyIdRaw
          ? parseInt(historyIdRaw, 10)
          : Number.NaN;
        if (!Number.isFinite(historyId)) {
          res
            .status(400)
            .json({ success: false, message: "Invalid historyId" });
          return;
        }
        const row = await service.softDeleteHistoryRevision({
          historyId,
          actorUserUid: actor.userUid,
        });
        ok(res, row);
      } catch (err) {
        sendCmsError(res, err);
      }
    },
  );

  // ═══════════════════════════════════════════════════════════════════════
  //  HARD-DELETE REVISION   DELETE /:uid/history/:historyId
  // ═══════════════════════════════════════════════════════════════════════
  router.delete(
    "/:uid/history/:historyId",
    authz.requireAuthor,
    async (req: Request, res: Response) => {
      try {
        const historyIdRaw = getSingleParam(req.params.historyId);
        const historyId = historyIdRaw
          ? parseInt(historyIdRaw, 10)
          : Number.NaN;
        if (!Number.isFinite(historyId)) {
          res
            .status(400)
            .json({ success: false, message: "Invalid historyId" });
          return;
        }
        await service.hardDeleteHistoryRevision(historyId);
        ok(res, null);
      } catch (err) {
        sendCmsError(res, err);
      }
    },
  );

  // ═══════════════════════════════════════════════════════════════════════
  //  UPDATE HISTORY VERSION META   PATCH /:uid/history/:historyId/meta
  // ═══════════════════════════════════════════════════════════════════════
  router.patch(
    "/:uid/history/:historyId/meta",
    authz.requireAuthor,
    async (req: Request, res: Response) => {
      try {
        const historyIdRaw = getSingleParam(req.params.historyId);
        const historyId = historyIdRaw
          ? parseInt(historyIdRaw, 10)
          : Number.NaN;
        if (!Number.isFinite(historyId)) {
          res
            .status(400)
            .json({ success: false, message: "Invalid historyId" });
          return;
        }
        const actor = authz.getActorContext(req);
        const { version, notes } = req.body ?? {};
        const row = await service.updateHistoryVersionMeta({
          historyId,
          version: version ?? null,
          notes: notes ?? null,
          actorUserUid: actor.userUid,
        });
        ok(res, row);
      } catch (err) {
        sendCmsError(res, err);
      }
    },
  );

  // ═══════════════════════════════════════════════════════════════════════
  //  UPDATE METADATA (no snapshot)   PATCH /:uid/metadata
  // ═══════════════════════════════════════════════════════════════════════
  router.patch(
    "/:uid/metadata",
    authz.requireAuthor,
    async (req: Request, res: Response) => {
      try {
        const uid = getSingleParam(req.params.uid);
        if (!uid) {
          res.status(400).json({ success: false, message: "Missing uid" });
          return;
        }
        const actor = authz.getActorContext(req);
        const row = await service.updateMetadataByUid({
          uid,
          metadata: req.body?.metadata ?? req.body ?? {},
          actorUserUid: actor.userUid,
        });
        await enrichMetadataEmails(row);
        setEtagHeader(res, row);
        ok(res, row);
      } catch (err) {
        sendCmsError(res, err);
      }
    },
  );

  // ── Router-level error handler ────────────────────────────────────────
  router.use(
    (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
      sendCmsError(res, err);
    },
  );

  return router;
}
